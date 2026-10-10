# 画像変換 — Astro / Rust / WebAssembly

画像ファイルをブラウザーの専用 Worker 内の Rust/Wasm で読み込み、静止画像に変換するローカルアプリです。画像データをサーバーに送信しません。変換処理に外部 API、CDN、外部フォントを使用しません。

## ビルド済み配布物を起動

Windows では `START.cmd` をダブルクリックしてください。Windows 標準の PowerShell が同梱の `dist` を `http://127.0.0.1:4173/` で配信し、ブラウザーを開きます。ポートが使用中の場合は、4174以降の空きポートに自動で切り替わります。インターネット接続、Node.js、Rust のインストールは必要ありません。終了するには起動した画面で Ctrl+C を押します。

`dist/index.html` を直接ダブルクリックする `file://` 方式では、ブラウザーの Wasm / Worker 制限により動作しません。他の OS では任意のローカル静的 HTTP サーバーで `dist` を配信してください。Wasm の MIME 型は `application/wasm` にしてください。

## 使い方

1. ファイルを追加、またはドロップします。
2. サイズ、形式、ページ・フレーム数、解析エラーを確認します。
3. 複数ページ・フレームは「すべて」または `1,3-5` などの範囲で指定します。表示上の番号は1から始まります。
4. 出力形式と設定を指定し、変換します。
5. 各出力を保存、または ZIP でまとめて保存します。

アニメーション入力の各フレームは独立した静止画像になります。アニメーションを維持する出力、RAW・PSD・AI・PDF・DICOM 出力は提供しません。

キーボード: Ctrl+O = ファイル追加、Ctrl+Enter = 変換、Esc = 変換キャンセル。テーマ切替は画面右上から行えます。

## 制限とデータの扱い

- 入力1ファイル64 MiB、画像40,000,000画素、幅・高さ16,384 pxまで。圧縮方式やブラウザーの空きメモリによっては、これより小さな画像でも処理できない場合があります。
- 変換は1件ずつ Worker で実行します。キャンセル時は Worker を終了します。
- 選択ファイルと変換結果は端末のメモリ上に置きます。ファイル保存は利用者のダウンロード操作で行います。
- ローカル起動サーバーは127.0.0.1のみで待ち受けます。GET/HEAD の静的ファイル配信に限定し、画像アップロード用の処理はありません。
- 設定や各形式の制約・検証範囲は `docs/SUPPORT.md` を参照してください。

## ソースから再ビルド

依存パッケージの初回取得にはネット接続が必要です。実行時はビルド済み資材だけで利用できます。

```powershell
npm install
Set-Location engine
wasm-pack build --target web --out-dir ../public/wasm
Set-Location ..
npm run build
.\START.cmd
```

Rust の必要バージョンは `engine/rust-toolchain.toml` を参照してください。再現用の npm/Cargo のロックファイルを同梱します。

主要構成: `src/pages/index.astro`（画面）、`src/styles.css`（デザイントークン）、`src/client.ts`（UI・保存）、`src/worker.ts`（Worker通信）、`engine/src/lib.rs`・`extra.rs`（変換）、`public/wasm`（ビルド済みWasm）、`dist`（オフライン実行資材）。

デザインは提供された `docs/DESIGN_SYSTEM.md` に沿っています。

## ライセンス

このアプリのオリジナル部分は AGPL-3.0-only です。再配布時は [LICENSE](LICENSE) と [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) を確認してください。GPL、LGPL、MPL の依存クレートについては、ライセンス文書とソーススナップショットを `third-party-sources/` に同梱しています。

## 追加形式

SVG・EXR・HDR は入力に、JXL・TGA は入力と出力に対応しています。JXL 出力は可逆圧縮で、幅・高さともに 2 px 以上が必要です。EXR・HDR は8bit sRGBへ変換し、範囲外の明るさはクリップします。SVG の文字は同梱の Noto Sans で描画するため、日本語など未収録の文字は事前にパスへ変換してください。ブラウザーが直接表示できない形式はプレビューを省略します。詳しい制約は [docs/SUPPORT.md](docs/SUPPORT.md) を参照してください。
