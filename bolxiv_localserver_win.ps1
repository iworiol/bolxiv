param([ValidateRange(1,65535)][int]$Port = 8000, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$rootPath = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
# Windows-standard .NET async connections keep browser requests independent.
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
public static class BolxivLocalServer {
    private static readonly bool diagnostic=Environment.GetEnvironmentVariable("BOLXIV_SERVER_DIAGNOSTICS")=="1";
    private static void Trace(string value) { if(diagnostic)Console.Error.WriteLine(DateTime.UtcNow.ToString("HH:mm:ss.fff")+" "+value); }
    public static Task Queue(TcpClient client, string root) {
        return Serve(client, root);
    }
    private static async Task Serve(TcpClient client, string root) {
        using(client) {
            try {
                client.NoDelay=true;
                client.ReceiveTimeout=30000; client.SendTimeout=10000;
                using(NetworkStream stream=client.GetStream()) {
                    var buffer=new byte[2048];int offset=0,available=0;
                    for(int request=0;request<100;request++) {
                    var header=new MemoryStream(); int state=0;
                    // Idle speculative connections must not occupy a worker or
                    // be reset while the browser is still preparing a request.
                    Task deadline=Task.Delay(30000);
                    while(header.Length<16384) {
                        if(offset>=available) {
                        Task<int> reading=stream.ReadAsync(buffer,0,buffer.Length);
                        if(await Task.WhenAny(reading,deadline)!=reading)return;
                        available=await reading;offset=0;if(available==0)return;
                        }
                        while(offset<available&&header.Length<16384) {
                            int value=buffer[offset++];header.WriteByte((byte)value);
                            state=(state==0&&value==13)?1:(state==1&&value==10)?2:(state==2&&value==13)?3:(state==3&&value==10)?4:0;
                            if(state==4)break;
                        }
                        if(state==4)break;
                    }
                    if(state!=4)return;
                    string[] lines=Encoding.ASCII.GetString(header.ToArray()).Split(new[]{"\r\n"},StringSplitOptions.None);
                    string[] parts=lines[0].Split(' ');
                    string method=parts[0],status="404 Not Found",file=null,mime="text/plain; charset=utf-8";
                    bool close=parts.Length!=3||parts[2]!="HTTP/1.1"||request==99;
                    foreach(string line in lines) {
                        if(line.StartsWith("Connection:",StringComparison.OrdinalIgnoreCase)&&line.Substring(11).Trim().Equals("close",StringComparison.OrdinalIgnoreCase))close=true;
                        if(line.StartsWith("Transfer-Encoding:",StringComparison.OrdinalIgnoreCase)||(line.StartsWith("Content-Length:",StringComparison.OrdinalIgnoreCase)&&line.Substring(15).Trim()!="0"))close=true;
                    }
                    Trace("request "+(parts.Length>1?parts[1].Split('?')[0]:"invalid request"));
                    if(parts.Length==3&&(method=="GET"||method=="HEAD")) {
                        string url=Uri.UnescapeDataString(parts[1].Split('?')[0]);
                        if(url.EndsWith("/",StringComparison.Ordinal))url+="index.html";
                        string ext=Path.GetExtension(url).ToLowerInvariant();
                        bool allowed=url=="/images/favicon.png"||url=="/images/apple-touch-icon.png"||url=="/images/favicon.svg"||url=="/index.html"||url=="/bolxiv.js"||(url.StartsWith("/js/",StringComparison.Ordinal)&&ext==".js")||(url.StartsWith("/css/",StringComparison.Ordinal)&&ext==".css");
                        if(allowed&&url.IndexOf("/__develop__/",StringComparison.OrdinalIgnoreCase)<0&&url.IndexOf('\\')<0&&url.IndexOf(':')<0&&url.IndexOf('\0')<0) {
                            bool traversal=false;
                            foreach(string segment in url.Split('/'))if(segment==".."||segment==".")traversal=true;
                            if(!traversal) {
                                string candidate=Path.GetFullPath(Path.Combine(root,url.TrimStart('/')));
                                if(candidate.StartsWith(root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)&&File.Exists(candidate)) {
                                    bool safe=true;
                                    for(string item=candidate;!String.Equals(item,root,StringComparison.OrdinalIgnoreCase);item=Path.GetDirectoryName(item)) {
                                        if(String.IsNullOrEmpty(item)||(File.GetAttributes(item)&FileAttributes.ReparsePoint)!=0){safe=false;break;}
                                    }
                                    if(safe){file=candidate;status="200 OK";mime=(ext==".html"?"text/html":ext==".css"?"text/css":ext==".svg"?"image/svg+xml":ext==".png"?"image/png":"text/javascript")+"; charset=utf-8";}
                                }
                            }
                        }
                    } else if(parts.Length==3){status="405 Method Not Allowed";close=true;}
                    string etag=null;
                    if(file!=null) {
                        var info=new FileInfo(file);
                        etag="\""+info.LastWriteTimeUtc.Ticks.ToString("x")+"-"+info.Length.ToString("x")+"\"";
                        foreach(string line in lines) {
                            if(line.StartsWith("If-None-Match:",StringComparison.OrdinalIgnoreCase)&&line.Substring(14).Trim()==etag){status="304 Not Modified";break;}
                        }
                    }
                    bool notModified=status.StartsWith("304");
                    byte[] fallback=Encoding.UTF8.GetBytes(status);
                    long length=file==null?fallback.Length:new FileInfo(file).Length;
                    string response="HTTP/1.1 "+status+"\r\nContent-Type: "+mime+"\r\n"+(notModified?"":"Content-Length: "+length+"\r\n")+"Cache-Control: no-cache\r\n"+(etag==null?"":"ETag: "+etag+"\r\n")+"X-Content-Type-Options: nosniff\r\nConnection: "+(close?"close":"keep-alive")+"\r\n"+(status.StartsWith("405")?"Allow: GET, HEAD\r\n":"")+"\r\n";
                    byte[] bytes=Encoding.ASCII.GetBytes(response);await stream.WriteAsync(bytes,0,bytes.Length);
                    if(method!="HEAD"&&!notModified) {
                        if(file==null)await stream.WriteAsync(fallback,0,fallback.Length);
                        else using(FileStream input=File.OpenRead(file))await input.CopyToAsync(stream);
                    }
                    Trace("complete "+(file==null?status:Path.GetFileName(file))+" "+length);
                    if(close)return;
                    }
                }
            } catch(IOException error) { Trace(error.ToString()); } catch(SocketException error) { Trace(error.ToString()); } catch(ArgumentException error) { Trace(error.ToString()); } catch(UnauthorizedAccessException error) { Trace(error.ToString()); }
        }
    }
}
'@
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, $Port)
try {
    $listener.Start()
    Write-Host ""
    Write-Host "BOARD OF LIGHT XIV - Local server"
    Write-Host "PC: http://localhost:$Port/"
    Write-Host "Phone URLs (use the same Wi-Fi):"
    foreach ($adapter in [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        if ($adapter.OperationalStatus -ne 'Up' -or $adapter.NetworkInterfaceType -eq 'Loopback') { continue }
        foreach ($address in $adapter.GetIPProperties().UnicastAddresses) {
            if ($address.Address.AddressFamily -eq 'InterNetwork') {
                Write-Host "  http://$($address.Address):$Port/  ($($adapter.Name))"
            }
        }
    }
    Write-Host "Allow private-network access if Windows Firewall asks."
    Write-Host 'Keep this PC and window running. Stop: Ctrl+C or close this window.'
    Write-Host 'Only this tool HTML/CSS/JS and app icons are served. Data stays in each browser.'
    Write-Host "If the port is busy: bolxiv_localserver_win.bat -Port 8001"
    if ($OpenBrowser) {
        try { Start-Process -FilePath "http://localhost:$Port/" }
        catch { Write-Host "Could not open browser. Open http://localhost:$Port/ manually." -ForegroundColor Yellow }
    }
    while ($true) {
        if (-not $listener.Pending()) { Start-Sleep -Milliseconds 10; continue }
        [void][BolxivLocalServer]::Queue($listener.AcceptTcpClient(), $rootPath)
    }
} catch {
    Write-Host "Server stopped: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    $listener.Stop()
}
