# BOARD OF LIGHT XIV — 開発構成

このフォルダーだけをコピーしても `index.html` から起動できます。他ツールや上位フォルダーの共通コードには依存しません。サーバーを使う場合はHTML・CSS・JavaScriptを配信してください。

## 入口と起動順

- `index.html`：画面のHTML、ダイアログ、スタイルの読み込み順。
- `index.html`内の生成済み起動処理：信頼の起点。HTTP/HTTPSでは最初の起動JS・起動画面CSSをSRIで検査します。
- `js/integrity-loader.js`：照合表と本体の検査、スタイル検査、HTML直接起動時の未検査表示。
- `js/integrity-manifest.js`：全JS・CSSのSHA-384照合表。生成物なので直接編集しません。
- `bolxiv.js`：起動状態、スクリプトの読み込み、起動完了後の操作窓口。
- `js/load-order.js`：依存順の唯一の一覧。関数定義 → 初期化 → 機能設定の順に読み込みます。
- `js/storage-bootstrap.js`：従来と同じIndexedDBからデータ・画像を復元してから起動します。

`Bolxiv.ready === true` かつ `boardStorageStarting === false` が操作可能な状態です。初期レイアウトとスマホの自動フィットも完了してから公開します。

JS・CSSの変更後は、プロジェクトのルートで `node __develop__/scripts/generate-integrity.cjs` を実行して照合表とHTMLを更新し、その一式をテストします。`--check`を付けると書き換えずに更新漏れを検出します。結合・圧縮は行いません。

## JavaScript

| ファイル／フォルダー | 役割 |
| --- | --- |
| `js/state.js` / `state-access.js` | 編集データ、選択状態、画像ライブラリ、状態参照 |
| `js/storage.js` | 自動保存、遅延保存、保存設定 |
| `js/history.js` | 履歴、元に戻す、やり直す |
| `js/contents.js` / `js/contents/` | コンテンツ管理、操作メニュー |
| `js/phases.js` / `js/phases/` | フェーズ、グループ、コピー、並列表示 |
| `js/canvas.js` / `js/canvas/` | 描画、配置、選択、移動、プロパティ |
| `js/file-io.js` | JSONとPNGの入出力 |
| `js/images.js` / `embedded-images.js` | 画像の解決、標準画像、グループ用作例データ |
| `js/desktop/` / `js/mobile/` | PC／スマホ固有のレイアウトと操作 |
| `js/help.js` / `js/help/` | ガイド、説明、チュートリアル |
| `js/runtime/` | DOM接続、イベント登録、初期値設定。実行順を維持するための初期化段階 |

互換性を優先し、既存のclassic scriptと共有変数を維持しています。ES modulesへの全面変更や、既存のrender拡張の一括書き換えは行っていません。役割別ファイルと明示した読み込み順を起点に、機能ごとに依存を整理できます。新しいコードからの操作には `Bolxiv.actions` を使用できます。

`assets/...` という文字列は既存JSONとの互換性のための画像識別子です。標準画像は `embedded-images.js` 内に存在し、assetsフォルダーを読みません。画像の更新も埋め込みデータ側で行います。

## CSS

`css/base.css` に基本画面と既存のレスポンシブ指定、その他のファイルに機能別の指定があります。デスクトップ／スマホ専用ファイルにはそれぞれ `desktop-` / `phone-` または `mobile-` の接頭辞を付けています。

CSSは読み込み順も動作の一部です。今回の移行では各styleブロックの順序と内容を保ち、`index.html` のlink順で再現しています。名前だけを基準にPC用／スマホ用の3ファイルへ集約すると優先順位が変わるため、その整理は個別の検証とともに行います。

## 保存の互換性

IndexedDB・localStorageの名前、JSON形式、履歴の仕様は変更していません。同じHTTPのホスト・ポートであればURLのパス変更によって保存先は変わりません。ファイルを直接開く場合の保存先の扱いはブラウザーによって異なるため、移動前にはJSONを保存してください。

## 動作確認

リポジトリのルートから `node __develop__/tests/bolxiv/check-release.cjs` を実行します。Node.js、Playwright、Microsoft Edgeが必要です。これらは開発用で、利用者のPCでのサーバー起動には不要です。

CSSの整理・構文確認は `node __develop__/tests/bolxiv/normalize-css.cjs` です。`--write` は同じ親・同じセレクタ内の完全一致重複だけを整理します。
