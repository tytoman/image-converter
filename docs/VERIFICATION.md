# 検証結果

## 2026-10-10 追加形式

SVG・EXR・HDR 入力と、JXL・TGA 入出力を追加しました。

- `cargo test --locked --lib`: 14件成功。JXL の色・透過の可逆往復、TGA の RGBA 往復、SVG の外部画像参照の省略を含みます。
- `npm.cmd exec tsc -- --noEmit`: 成功。
- `node scripts/verify-added-formats.mjs`: 実際の同梱 Wasm を Node.js 上で実行し、追加5形式の解析と PNG・JXL・TGA へのサイズ変更変換を確認しました。JXL の色・透過保持、EXR・HDR の線形 RGB から sRGB への画素変換、入力専用形式への出力拒否、1px JXL 出力・過大 SVG・破損 JXL の拒否も確認しました。
- ビルドと独立したコードレビューを実施しました。追加形式についてブラウザー操作による検証や、大きな画像・各形式の全バリエーションの網羅は行っていません。

JXL 出力は幅・高さがともに2px以上必要です。SVG のフォントや埋め込み画像、EXR のレイヤー、JXL の色空間の制約は [SUPPORT.md](SUPPORT.md) を参照してください。

最適化済み Wasm の SHA-256: `2E370AADEB80B925E0F812BB3B6AA4453DE14443D7D49E367D502C831927EAC0`。`public/wasm` と `dist/wasm` を更新しました。

## 2026-10-05 既存形式

2026-10-05 に Windows の Microsoft Edge（ヘッドレス）とローカル HTTP 配信で検証しました。

| 検証 | 結果 |
|---|---|
| Rust の回帰テスト | 12件成功（HEIFアイテム列挙・選択の6件を含む） |
| ブラウザー内の変換・解析テスト | 正常系27件成功、破損PNGと未対応拡張子の2件を想定どおり拒否 |
| 出力形式 | PNG / JPEG / BMP / GIF / TIFF / WebP / AVIF / HEIF / HEIC の全9形式を生成、再デコード、寸法と画素の色を確認 |
| 複数フレーム | GIF / APNG / WebP / AVIF の2フレーム入力から指定フレームを静止画像へ変換 |
| 複数ページ | 2ページのTIFF / PDF / PDF互換AIを解析・選択・変換 |
| その他の入力 | PSD合成画像、非圧縮・JPEG圧縮・RLE圧縮DICOM、HEIC / HEIF / AVIF |
| 一括変換・保存 | 8入力中の有効な7入力から11枚生成。破損入力を除外し、個別PNGと11枚を含むZIPを保存・再検査 |
| オフライン | UIとWasmの初期読み込み後、ブラウザーをオフラインに切り替え、一括変換・個別保存・ZIP保存に成功 |
| 通信 | 検証中の外部リクエスト0件。画像データの送信処理なし |
| UI | TypeScriptチェック成功。無効な解像度・フレーム指定の拒否、エラー理由の表示、Escキャンセル、テーマ切替を確認 |
| 表示 | デスクトップと390px幅を確認。画面全体の横はみ出しなし |
| 起動 | Windows標準PowerShellのローカル配信スクリプトを使用。WasmのMIME型は application/wasm |

検証したWasmのSHA-256:

```
C863C37BDD4AC18712B03B154776A99638EBFDF6D1F669247B5C30AE12F81D51
```

ブラウザーのオフライン設定は初期読み込み後の実行テストです。コールドスタートではブラウザーから同梱ファイルをローカルHTTPで読み込みます。ローカルHTTP配信にインターネット接続は必要ありません。

CR2 / NEF / ARW はRustデコーダーと簡易現像を実装していますが、実機カメラのRAWコーパスによる検証は行っていません。すべての形式の全バリエーション、全ブラウザー、40MPの上限付近を網羅した検証ではありません。具体的な制約は [SUPPORT.md](SUPPORT.md) を参照してください。

## CSP verification specification

The CSP meta policy in `src/pages/index.astro` and the HTTP response policy in `scripts/serve.ps1` restrict CSP-governed resource and API requests to same-origin destinations. `default-src 'none'` is the baseline. The allowlist is limited to same-origin scripts, styles, and WASM retrieval; `blob:` for local generated-image previews; and local workers. `data:`, inline styles, form submission, external images, and external fonts are not allowed. `connect-src 'self'` is required to retrieve the WASM file. `frame-ancestors 'none'` is applied by the HTTP header because meta policies cannot set it. CSP does not reliably block top-level browser navigation; that path is checked separately by source inspection and the bounded procedure below.

### Bounded evidence procedure

1. Build with `npm run build`, then serve with `scripts/serve.ps1`. Open browser DevTools Network, enable Preserve log, and reload. Confirm requests go only to `127.0.0.1`; repeat through image conversion, generated preview, and download. This is evidence for that browser and run, not proof about future code, browser extensions, or other processes.
2. Inspect the Document response headers and HTML meta tag. Confirm `default-src 'none'`, `connect-src 'self'`, `img-src 'self' blob:`, `style-src 'self'`, and `style-src-attr 'none'` in both. Confirm the HTTP response also has `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.
3. In the app document's execution context, use DevTools Console or an isolated test page to try an external stylesheet, CSS `@import`, CSS `url(https://...)`, external image, external font, `fetch`, XHR, WebSocket, `sendBeacon`, external Worker, media, iframe, object, and form submission. For each CSP-governed attempt, confirm a CSP violation appears and no corresponding external request appears in Network. Confirm the blocked form does not navigate.
4. Confirm generated `blob:` image previews still render. Preview a user SVG containing external image, stylesheet, and font references; check Network for no requests to those origins. Also confirm `data:` images, inline style attributes, and JS writes that create style attributes are blocked. The app's dynamic visual state must use CSS classes or finite `data-fill` / `data-progress` values rather than writing arbitrary values to style attributes.
5. Search the shipped application HTML and JavaScript for external anchors, `location` assignments, `window.open`, and navigation-producing APIs. Confirm none are present. In an isolated test page, also try an external link and `window.location` navigation to document that browsers may navigate despite CSP; these are outside the CSP request-blocking guarantee. If policy requires blocking all external navigation, enforce it at a browser or network boundary and verify there.

### Scope and limits

The policy makes the browser reject CSP-governed app-document resource/API requests to external origins. It does not prove that no network traffic of any kind occurs: browser navigation, browser update traffic, extensions, and other tabs or processes are outside this guarantee. The `scripts/serve.ps1` built-app path enforces the policy with an HTTP header. Astro `dev` and `preview` are not configured with the same response header, so their checks cover only the meta policy and do not verify the HTTP-header configuration.
