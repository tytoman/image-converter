# 開発者向け設計メモ

この文書は、現在の画面と `src/styles.css` に実装されている共通ルールを説明します。ここに記載のない部品や操作が実装済みであることを示すものではありません。

## 画面の構成

- 上部バー: アプリ名、変換エンジンの状態、テーマ切替。
- メイン領域: 左側に画像一覧とドロップ領域、右側に変換設定。
- 下部: ローカル処理の説明とキーボード操作。
- 画面幅が狭い場合: 設定と画像領域を縦に並べ、操作しやすい幅を保つ。

画面の構造とアクセシビリティ属性は `src/pages/index.astro`、状態の更新と操作は `src/client.ts`、変換処理は `src/worker.ts` と `engine/src/` にあります。

## 見た目の基本方針

- 画像と設定を主役にし、背景や境界線のコントラストは控えめにする。
- 通常、ホバー、押下、フォーカス、選択、無効、エラーの状態を区別する。状態を色だけで伝えない。
- 余白、文字サイズ、色は共通トークンを使う。局所的な固定値を増やす前に既存トークンが使えるか確認する。
- キーボードで操作できる部品には、見えるフォーカス表示を付ける。
- アイコンだけのボタンには、アクセシブルな名前とツールチップを付ける。

## CSS トークン

トークンは `src/styles.css` の `@layer tokens` に定義します。意味に合わせて次の変数を使います。

| 用途 | CSS 変数の例 |
|---|---|
| 背景・面 | `--surface-background`, `--surface-default`, `--surface-panel`, `--surface-modal` |
| 文字 | `--text-default`, `--text-muted`, `--text-disabled`, `--text-accent` |
| 状態 | `--status-info`, `--status-success`, `--status-warning`, `--status-error` |
| 操作部品 | `--element-background`, `--element-hover`, `--element-active`, `--element-selected` |
| 境界線 | `--border-default`, `--border-muted`, `--border-focused`, `--border-selected` |
| アイコン | `--icon-default`, `--icon-muted`, `--icon-disabled`, `--icon-accent` |
| 文字組み | `--font-ui`, `--font-mono`, `--text-*`, `--heading-*`, `--font-*` |
| 間隔・寸法 | `--space-*`, `--gap-*`, `--row-height`, `--control-height` |
| 形・動き | `--radius-*`, `--shadow-*`, `--ease-*`, `--duration-*` |

色は `light-dark()` でライト・ダーク両方を定義し、テーマ切替は `data-theme` と `color-scheme` で行います。新しいトークンを追加する場合は、用途と両テーマの値を定義してください。

## 部品と操作状態

- ボタンは用途に応じて `subtle`、`outlined`、`primary`、`tinted` など既存のクラスを使います。主要操作の強調は画面内で絞ります。
- 入力欄、選択欄、チェックボックスには、フォーカス、無効、エラー状態を反映します。
- 一覧や画像行では、情報の読み順と列の対応を維持します。狭い画面ではレイアウトを切り替え、横幅が必要な一覧は内部スクロールにします。
- ショートカットは `<kbd>` を使い、説明文と視覚的に区別します。

## 変更時の確認

1. 既存の CSS 変数とクラスを確認し、同じ意味の定義を重複させない。
2. ライト・ダークの両方で文字、境界線、状態表示を確認する。
3. キーボードフォーカス、無効状態、狭い画面での並びを確認する。
4. UI の構造を変えた場合は、ARIA 名、ラベル、状態属性も合わせて更新する。
