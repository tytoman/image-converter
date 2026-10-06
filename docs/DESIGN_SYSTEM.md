# Design System

## 1. Overview

本プロジェクトのUIは、以下の原則を基礎とする。

- 高密度な情報表示
- コンテンツ主体のUI
- Semantic Tokenによる一貫した表現
- 控えめな視覚階層
- Progressive Disclosure
- Keyboard-first Interaction
- 小さく再利用可能なUI Component
- ThemeによるLight / Dark両対応
- 状態を色だけに依存しない
- UI Densityを保ちながら可読性を維持する

UIそのものを目立たせるのではなく、ユーザーが操作対象となるコンテンツへ集中できることを最優先する。

---

# 2. Design Principles

## 2.1 Content First

UIはコンテンツより目立ってはならない。

通常状態では背景、境界線、アイコン、ボタンなどの視覚的主張を抑える。

強調は以下の場合に限定する。

- 選択中
- Hover中
- Focus中
- エラー
- 警告
- 重要なPrimary Action

---

## 2.2 Dense, Not Cramped

高密度なUIを採用する。

ただし単純に余白を削るのではなく、

- 一貫したSpacing
- 明確なAlignment
- Typography hierarchy
- Surface hierarchy

によって読みやすさを維持する。

標準的な操作要素は18〜32px程度の高さを基本とする。

---

## 2.3 Semantic Design

色や余白を直接指定するのではなく、意味を持つTokenを使用する。

悪い例:

```text
color: #888888
padding: 4px
```

推奨:

```text
color: text.muted
padding: spacing.4
```

コンポーネントは「どの色か」ではなく「何を意味するか」を指定する。

---

## 2.4 Progressive Disclosure

補助操作は常時表示しない。

例:

```text
通常

filename.rs


Hover

filename.rs                  Rename  Delete
```

以下の要素は必要に応じてHover時のみ表示する。

- 補助Action
- Context Action
- Secondary Button
- Additional metadata

---

## 2.5 Keyboard First

主要操作はKeyboardから実行可能にする。

可能な限り、

- Shortcut
- Focus navigation
- Command palette
- Escapeによるキャンセル
- Enterによる確定

を提供する。

Keyboard Shortcutは単なる説明文ではなく、UI Componentとして扱う。

---

# 3. Design Tokens

---

# 3.1 Color

固定色ではなくSemantic Colorを使用する。

## Text

```text
text.default
text.muted
text.hidden
text.disabled
text.placeholder
text.accent
text.selected
```

用途:

| Token | 用途 |
|---|---|
| `text.default` | 通常テキスト |
| `text.muted` | 補助情報 |
| `text.hidden` | 非常に弱い情報 |
| `text.disabled` | 無効状態 |
| `text.placeholder` | Placeholder |
| `text.accent` | リンク・強調 |
| `text.selected` | 選択状態 |

---

## Semantic State

```text
status.info
status.success
status.warning
status.error
```

追加でVersion Control等が必要な場合:

```text
status.created
status.modified
status.deleted
status.conflict
```

---

# 3.2 Surface

背景色にはSurface hierarchyを使用する。

```text
surface.background
surface.default
surface.editor
surface.panel
surface.elevated
surface.modal
```

視覚階層:

```text
Background
    ↓
Surface
    ↓
Editor / Panel
    ↓
Elevated Surface
    ↓
Modal
```

Surface間の差は小さくする。

強い色差ではなく、

- 微妙なBrightness差
- Border
- 必要最低限のShadow

で階層を表現する。

---

# 3.3 Interactive Element

操作要素用Token:

```text
element.background
element.hover
element.active
element.selected
element.disabled
```

背景を通常状態では表示しないGhost系Element:

```text
element.ghost.background
element.ghost.hover
element.ghost.active
element.ghost.selected
element.ghost.disabled
```

Ghost ElementはToolbar、Icon Button、List Actionなどで優先的に使用する。

---

# 3.4 Border

```text
border.default
border.muted
border.focused
border.selected
border.disabled
```

Borderは原則1px。

Surface間の区切りにはShadowよりBorderを優先する。

---

# 3.5 Typography

UIとコンテンツ用フォントを分離する。

```text
font.ui
font.mono
```

推奨:

```text
UI Font:
  Sans Serif
  Weight 400–500

Code / Technical Content:
  Monospace
  Weight 400
```

---

## Text Size

```text
text.xs      10px
text.sm      12px
text.md      14px
text.lg      16px
```

基本UI:

```text
12px / 14px
```

を中心とする。

---

## Heading

```text
heading.xs     14px
heading.sm     16px
heading.md     18px
heading.lg     20px
heading.xl     22px
```

UI内で極端に大きな見出しは使用しない。

---

## Font Weight

```text
font.normal      400
font.medium      500
font.semibold    600
```

`700+`は原則として使用しない。

強調はWeightだけでなく、

- Color
- Spacing
- Surface

も併用する。

---

# 3.6 Line Height

UI:

```text
1.2–1.4
```

長文:

```text
1.5–1.6
```

コード:

```text
1.5–1.65
```

---

# 3.7 Spacing

基本Spacing Scale:

```text
0
1px
2px
3px
4px
6px
8px
12px
16px
20px
24px
32px
40px
48px
```

Semantic Token:

```text
spacing.0
spacing.1
spacing.2
spacing.3
spacing.4
spacing.6
spacing.8
spacing.12
spacing.16
spacing.20
spacing.24
spacing.32
spacing.40
spacing.48
```

主要UIでは以下を多用する。

```text
2px
4px
6px
8px
12px
```

---

# 3.8 Density

UI Density:

```text
compact
default
comfortable
```

Defaultを基準とする。

例:

| Token | Compact | Default | Comfortable |
|---|---:|---:|---:|
| Small Gap | 2 | 4 | 6 |
| Medium Gap | 4 | 6 | 8 |
| Large Gap | 6 | 8 | 12 |

密度変更時もComponent構造は変更しない。

SpacingのみをScaleさせる。

---

# 3.9 Radius

角丸は控えめに使用する。

```text
radius.none     0px
radius.xs       2px
radius.sm       4px
radius.md       6px
radius.lg       8px
```

標準:

```text
4px
```

ButtonやInputで過度なPill Shapeは使用しない。

---

# 3.10 Shadow

ShadowはFloating UIに限定する。

通常Surfaceでは使用しない。

```text
shadow.none

shadow.elevated
0 2px 3px rgba(0, 0, 0, 0.12)

shadow.modal
0 8px 24px rgba(0, 0, 0, 0.18)
```

使用対象:

```text
Popover
Dropdown
Context Menu
Tooltip
Modal
Floating Panel
```

---

# 4. Iconography

UI Iconは小型を基本とする。

```text
icon.indicator    10px
icon.xs           12px
icon.sm           14px
icon.md           16px
icon.xl           48px
```

標準:

```text
16px
```

密度の高いUI:

```text
12px / 14px
```

---

## Icon Color

```text
icon.default
icon.muted
icon.disabled
icon.placeholder
icon.accent
```

原則としてIcon固有の固定色は使用しない。

---

# 5. Interaction States

Interactive Componentは最低限以下を実装する。

```text
default
hover
active
focus
selected
disabled
```

---

## Default

視覚的主張を最小化する。

---

## Hover

背景またはForegroundを軽く変化させる。

```text
background → element.hover
```

---

## Active

Hoverより一段強い状態。

```text
background → element.active
```

---

## Focus

Keyboard Focusを明確に表示する。

```text
border → border.focused
```

必要に応じてFocus Ringを追加する。

---

## Selected

選択されたItemは背景とForegroundの両方で表現する。

---

## Disabled

Opacityだけに依存しない。

```text
foreground → disabled
background → disabled
interaction → disabled
cursor → default
```

---

# 6. Buttons

Buttonは用途に応じてVariantを使用する。

```text
subtle
filled
outlined
outlinedGhost
tinted
transparent
```

---

# 6.1 Subtle

標準Button。

通常状態では背景を持たない。

```text
Default:
  background: transparent

Hover:
  background: element.ghost.hover

Active:
  background: element.ghost.active
```

ToolbarやPanel Actionでは原則Subtleを使用する。

---

# 6.2 Filled

重要なPrimary Action用。

例:

```text
Create
Save
Confirm
Run
```

同一画面内で乱用しない。

---

# 6.3 Outlined

Secondary Action用。

```text
border: border.default
```

---

# 6.4 Outlined Ghost

通常時の視覚的重要度をさらに下げたOutlined Button。

---

# 6.5 Tinted

Semantic Action用。

```text
accent
success
warning
error
```

例:

```text
Delete → error
Retry → warning
Apply → accent
```

---

# 6.6 Transparent

背景変化を持たず、Foregroundのみ変化させる。

非常に軽量な補助操作に使用する。

---

# 6.7 Button Size

```text
button.compact    18px
button.default    22px
button.medium     28px
button.large      32px
```

標準:

```text
22–28px
```

---

# 7. Icon Button

IconのみのButtonには必ずTooltipを付ける。

```text
[ Icon ]
```

Tooltip:

```text
Action Name

Ctrl Shift P
```

Icon Buttonは通常Subtle Variantを使用する。

---

# 8. Input

標準Input:

```text
height: 28–32px
border: 1px
radius: 4px
padding-inline: 6–8px
font-size: 12–14px
```

States:

```text
default
hover
focus
error
disabled
```

Focus時:

```text
border → border.focused
```

Error時:

```text
border → status.error
```

---

# 9. Checkbox

構造:

```text
[ ] Label
```

States:

```text
unchecked
checked
indeterminate
disabled
focused
```

Control Size:

```text
14–16px
```

---

# 10. Switch

Boolean設定にのみ使用する。

```text
Label                         [ ON ]
```

Checkboxとの使い分け:

```text
即座に状態が変化する設定
→ Switch

フォーム送信時に確定する選択
→ Checkbox
```

---

# 11. List Item

List Itemは本Design Systemの主要Componentとする。

基本構造:

```text
┌─────────────────────────────────────┐
│ Start   Content             End     │
└─────────────────────────────────────┘
```

Slots:

```text
start
content
end
hoverEnd
```

---

## Density

```text
extraDense
dense
default
sparse
```

---

## States

```text
default
hover
selected
focused
disabled
```

---

## Example

```text
▾  src                         3 files
   main.rs                     M
   app.rs
   theme.rs                    +
```

補助Action:

```text
main.rs                  Rename Delete
```

はHover時のみ表示してよい。

---

# 12. Tree

TreeはList Itemを基礎として構築する。

構造:

```text
Chevron
Icon
Label
Metadata
Actions
```

Indent:

```text
12–16px / level
```

階層表現を色ではなくIndentで行う。

---

# 13. Tabs

Tab Bar:

```text
height: 28–32px
```

Tab:

```text
Icon
Label
Modified Indicator
Close Action
```

Selected Tab:

- Background
- Foreground
- Border

の最低2つ以上で状態を表現する。

Close Buttonは原則Hover時のみ表示する。

---

# 14. Panel

Panel構造:

```text
Panel
├── Header
│   ├── Title
│   └── Actions
│
└── Content
```

Panel同士は強いShadowではなくBorderで分離する。

---

# 15. Toolbar

Toolbarは非常に高密度に保つ。

```text
height: 28–32px
```

主に以下を使用する。

```text
Icon Button
Button Subtle
Divider
Dropdown
Breadcrumb
```

Filled ButtonをToolbar内で
