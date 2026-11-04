# Vibasic Design System — handoff for Claude Code

Use this folder to build the real Vibasic app: an inventory-management web app with built-in decision support (lot and item tracking, FIFO issuing, manager approval, ROP/EOQ restock proposals). It has two roles: **Quản lý** (manager, desktop) and **Nhân viên kho** (warehouse staff, tablet/mobile).

## About these files
- **`tokens/`, `fonts/`, `assets/`, `styles.css`** are production-ready. Copy them into the app as they are.
- **`components/*.jsx`** are React 18 reference implementations. They have no dependencies and are styled only through CSS variables plus the `vb-*` classes in `components/components.css`. You can use them directly in a React codebase, or port them to another stack. Keep the props in each `.d.ts` file, which is the component contract.
- **`ui_kits/`** are **design references** (HTML prototypes), not production code. They show the intended layout, density and behaviour for three screens. Rebuild them in the app's own framework. To view them, open `ui_kits/*/index.html` through a local static server (they load `_ds_bundle.js`, a pre-compiled bundle of the components).
- **Fidelity: high.** Match the colours, sizes and copy exactly.

## Setup in a new app (suggested: Vite + React + TypeScript)
1. Copy `tokens/`, `fonts/`, `components/`, `assets/` and `styles.css` into `src/design/` (or similar), keeping their relative paths. `tokens/fonts.css` uses `../fonts/` URLs.
2. Import `styles.css` once at the app root.
3. Import components from their files, for example `import { Button } from './design/components/core/Button.jsx'`.
4. Set the document language: `<html lang="vi">`.

## Non-negotiable rules
- All UI text is Vietnamese with full diacritics. Use sentence case. Button labels are a verb plus an object ("Duyệt phiếu"). No emoji and no exclamation marks.
- Green `--green-500 #068037` is for the **primary action only**: one primary button per view, plus active navigation, focus and the approved/success state. Use cool greys for everything else.
- Never use colour alone to show meaning. `StatusBadge` and `PriorityChip` always combine an icon and a label.
- Use one font only: Be Vietnam Pro, weights 400, 500, 600 and 700. All quantities use `font-variant-numeric: tabular-nums`. Number format is vi-VN: `1.284` (dot for thousands), `3,5` (comma for decimals). Dates are `dd/mm/yyyy` and times use the 24-hour clock.
- Manager screens: 36 px controls, 36 px compact table rows, sticky table headers, filters, bulk-action bar.
- Warehouse screens: controls of **at least 44 px** (56 px is the default), a 64 px scan field, a step-by-step flow and a bottom tab bar.
- Focus must always be visible (`--focus-ring`). Contrast must meet WCAG AA.
- Animation is for functional feedback only (120–240 ms, `cubic-bezier(.2,0,0,1)`). Respect `prefers-reduced-motion`.
- **Avoid:** gradients, glassmorphism, large rounded cards with heavy soft shadows, illustrations, emoji used as icons, hero sections, chatbot-style UI.

## Design tokens (see `tokens/*.css` for the full list)
**Brand green:** 50 `#ECF7F0` · 100 `#D2ECDB` · 200 `#A6D8B7` · 300 `#6FBE8C` · 400 `#2F9C5C` · **500 `#068037`** · 600 `#056F30` (hover) · 700 `#045C28` (pressed) · 800 `#03481F` · 900 `#023417`

**Neutral (cool grey):** 0 `#FFFFFF` · 25 `#FAFBFC` · 50 `#F4F6F8` (page) · 100 `#EBEEF2` · 200 `#DDE2E8` (border) · 300 `#C4CBD4` (input border) · 400 `#9BA5B1` · 500 `#6A7583` · 600 `#525C69` (secondary text) · 700 `#3B4450` · 800 `#262D36` · 900 `#161B22` (primary text)

**Approval status** (text / background / border), read together with the `--status-*` variables:
- Nháp (draft): `#3B4450` / `#FFFFFF` / `#C4CBD4`
- Chờ duyệt (pending): `#855700` / `#FFF6DE` / `#F4D88E`
- Đã duyệt (approved): `#045C28` / `#ECF7F0` / `#A6D8B7`
- Từ chối (rejected): `#A41E15` / `#FDEDEC` / `#F4C1BC`
- Tạm hoãn / Tạm cách ly (on hold): `#46515E` / `#EEF1F4` / `#CCD3DB`
- Đã khóa (locked lot): `#FFFFFF` on `#1F2731`
- Info: `#1D5299` / `#EAF2FC` / `#B9D2F2`

**Restock priority**, read together with the `--priority-*` variables:
- Khẩn cấp (urgent): white on `#C2261B`
- Cần đặt (order): `#A3460A` / `#FEF0E5` / `#F8CBA6`
- Theo dõi (watch): `#1D5299` / `#EAF2FC` / `#B9D2F2`

**Type** (size/line-height, weight):
- Manager: KPI 28/34 600 · page title 22/30 600 (18/24 in the top bar) · section 16/24 600 · body 14/20 400 · table 13/18 400 · table head 12/16 600 · label 13/18 500 · helper 12/16 400 · overline 11/16 600, uppercase, +0.06em
- Warehouse: title 24/32 600 · heading 20/28 600 · body 16/24 400 · button 17/24 600 · scan 20/28 500 · quantity 32/40 600
- Codes (lot and serial numbers) get +0.02em letter-spacing at weight 500–600.

**Spacing:** 4 px base: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--space-*`).
**Control heights:** sm 28 · md 36 · lg 44 · xl 56 · scan 64. **Layout:** sidebar 232, top bar 56, warehouse header 64, bottom tabs 56.
**Radius:** badge 3 · control 4 · card/table 6 · dialog 8. **Chamfer:** a 6 px clipped top-left corner (`clip-path`), used on priority chips, KPI icon tiles, FIFO order numbers and the empty-state icon. It echoes the logo's wings.
**Elevation:** use borders first. card `0 1px 2px rgba(22,27,34,.06)` · dropdown/toast `0 4px 12px rgba(22,27,34,.10), 0 1px 2px rgba(22,27,34,.06)` · dialog `0 16px 40px rgba(22,27,34,.18), 0 2px 6px rgba(22,27,34,.08)` · overlay `rgba(22,27,34,.48)`.

## Components (`components/`, one `.jsx` + `.d.ts` + `.prompt.md` each)
- **core:** `Icon` (Lucide paths, square caps, miter joins), `Button` (primary, secondary, ghost, danger, danger-outline; sizes sm/md/lg/xl; loading), `IconButton` (requires a label; optional count badge)
- **forms:** `TextField` (label, required mark, helper, error, suffix, multiline), `SelectField`, `Checkbox` (indeterminate; lg size for touch), `QuantityStepper`, `ScanInput` (Enter submits; idle/success/error feedback; camera button)
- **status:** `StatusBadge` (draft, pending, approved, rejected, hold, locked, info), `PriorityChip` (urgent, order, watch), `ApprovalStepper` (Nháp → Chờ duyệt → Đã duyệt or Từ chối, with actor, time and note; horizontal or vertical)
- **feedback:** `AlertBanner`, `Toast` (dark, optional "Hoàn tác" undo), `EmptyState`, `ConfirmDialog` (`requireReason` blocks confirming until a reason is typed; use it on every rejection)
- **data:** `DataTable` (sticky header, selection with bulk bar, `groupBy` with a custom group header, sorting, empty slot), `FilterBar` (search, inline filter selects, removable chips, result count), `KpiTile` (clickable, links to the filtered list), `LotCard` (FIFO order number, age, location, pick progress; next, picking, waiting, done and locked states)
- **navigation:** `AppShell` (`role="manager"` gives a sidebar with sections and counts; `role="staff"` gives a green header and bottom tabs)

**Components the full app will need that are not built yet.** Compose them from the tokens using the same patterns:
- Tabs or segmented control (approval types)
- Date-range picker (reports)
- Pagination
- Radio group (stocktake type and scope)
- Switch (staff account active)
- Barcode label print preview
- Charts (the dashboard bar chart in `ui_kits/manager/dashboard.jsx` shows the style: flat bars, green for stock in, grey-700 for stock out, no gradients)
- Skeleton loading rows: grey-100 blocks, no shimmer

## Reference screens (`ui_kits/`)
- `manager/`: **Tổng quan** (dashboard: 4 KPI tiles, pending-approval table with Duyệt and Từ chối, open alerts, items below ROP, 7-day stock-in/out chart) and **Đề xuất nhập hàng** (restock proposal: priority summary, FilterBar, DataTable grouped by supplier with Tồn / Đang về / ROP / EOQ / Còn (ngày) / Ưu tiên / editable SL đề xuất / Lý do columns, bulk "Tạo đơn đặt hàng").
- `warehouse/`: **Xuất kho theo FIFO** on a 1180×820 tablet. Four steps: Chọn đơn → Lấy hàng FIFO → Gửi duyệt → Giao hàng. Scan validation for wrong lot, locked lot and duplicate scans; "Báo hàng lỗi" with a required reason and a FIFO replacement item.

The sample data in the kits uses furniture. The real product is **wooden kitchenware** (cutting boards, spoons, ladles, chopsticks, holders, trays). Replace the data, not the design.

## Assets
- `assets/logo-white.png` (on green) and `assets/logo-green.png` (on white); `mark-*.png` and `wordmark-*.png` for the sidebar lockup; `logo-original.jpg` is the source file. These were extracted from a JPG, so ask for an SVG before production.
- `assets/icons/*.svg`: 74 Lucide icons (v0.460.0, ISC licence). In code, use the `lucide-react` package with `strokeLinecap="square" strokeLinejoin="miter"` to get the same look.
- `fonts/`: Be Vietnam Pro woff2 files (OFL licence), with Vietnamese, Latin and Latin-ext subsets.

## Files
`README.md` (this file) · `DESIGN_GUIDE.md` (tone of voice, visual foundations, iconography) · `SKILL.md` · `styles.css` · `tokens/` · `fonts/` · `assets/` · `components/` · `guidelines/` (visual specimen pages) · `ui_kits/` · `_ds_bundle.js` (pre-compiled bundle, used only by the HTML references)
