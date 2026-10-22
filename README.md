# BOARD OF LIGHT XIV — ファイル構成

開発中も公開時も、同じファイルを直接使用します。`dist/` やソースの結合工程はありません。このフォルダーをそのままコピーして起動・公開できます。

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面・ダイアログと、生成済みの起動情報・起動画面 |
| `bolxiv.js` | 二重起動防止、IndexedDBの復元・保存、起動処理 |
| `js/integrity-loader.js` | HTTP/HTTPSでのSRI検査とCSS・起動処理の読み込み |
| `js/application.js` | 本体8ファイルの実行順一覧 |
| `js/canvas.js` | キャンバス描画・編集の共通処理 |
| `js/data-io.js` | フェーズ・コンテンツ・履歴・保存・入出力の共通処理 |
| `js/embedded-images.js` | 標準画像データ |
| `js/editor.js` | 状態と編集イベントの初期化 |
| `js/interface.js` | 編集モード・パレット・スマホの基本操作 |
| `js/png-preview.js` | PNGプレビュー・生成・保存 |
| `js/panels.js` | 入力・PC／スマホのペイン・チュートリアル |
| `js/phase-tools.js` | フェーズ・グループ・コンテンツの追加操作 |
| `css/base.css` | 共通スタイル・各部品の基本表示 |
| `css/panels.css` | ペインと各部品の表示調整 |
| `css/mobile.css` | スマホの基本配置・操作表示・パレット |
| `css/png-preview.css` | PNG生成画面 |
| `css/interface.css` | 閲覧・PC／スマホの追加UI |
| `css/startup.css` | 外部通信を待たずに表示する小さな起動画面 |
| `js/integrity-manifest.js` | 生成された照合表。HTMLにも同じ情報を埋め込むため起動時の通信は不要 |

編集対象は上記の実ファイルです。JSの実行順は `js/application.js`、CSSの適用順は `index.html` のリンク順で管理します。ファイル内の区切りコメントは細かな機能の目印です。既存の実行・適用順を維持し、分割ファイルをそのまま公開してください。別ソースから結合・再生成して編集内容を上書きする処理はありません。

## 起動

HTMLの解析時からJSを先読みし、CSSの取得と保存データの復元も並行して進めます。JS先読み・CSS取得はそれぞれ最大2本ずつに制限し、小さなローカルサーバーへの集中を避けます。JSは `js/application.js` の順で実行し、CSSは取得完了順によらずHTMLの順で適用します。起動一覧の取得は小さなJS1本です。

基本構成と読み込み状況は、HTML内の小さな起動スタイルで外部ファイルを待たずに表示します。CSSが揃うと実際の画面構成を表示し、保存データと全機能の準備が完了してから操作可能にします。

`Bolxiv.ready === true`、`boardStorageStarting === false`、`app-restoring` クラスの解除が操作可能の目印です。初期レイアウトとスマホの自動フィットが完了するまで操作を受け付けません。

## 変更後の確認

ルートで `node __develop__/scripts/generate-integrity.cjs` を実行してください。JS・CSSの改行をLFへ統一し、照合表・HTMLのチェック値と起動情報だけを更新します。`--check` で更新漏れを検出できます。`css/startup.css` の小さなスタイルだけは初期表示のためHTMLへ埋め込みます。

ブラウザー検証は `node __develop__/tests/bolxiv/check-release.cjs` です。Node.js、Playwright、Microsoft Edgeが必要です。通常の利用・公開にこれらの開発ツールは不要です。

## 保存の互換性

IndexedDB・localStorageの名前、JSON形式、履歴の仕様は変更していません。同じホスト・ポートであれば保存先を引き継ぎます。ファイルを直接開く場合の保存先はブラウザーによって異なるため、移動前にはJSONを保存してください。

標準画像は `js/embedded-images.js` 内に埋め込まれています。`assets/...` は既存JSONとの互換性のための画像識別子で、外部画像ファイルの読み込み先ではありません。
