# Vibasic Design System

**Quản lý kho rõ ràng, quyết định đúng lúc.** — *Clear stock, confident decisions.*

## Product context
Vibasic is an internal inventory-management web app for a wood-furniture company (cutting board, chopstick, spoon). It tracks stock **by lot and by individual item** (every lot and every unit has its own barcode ID), issues goods **FIFO** (oldest lot first, locked lots skipped), sends every receipt, issue, stocktake and abnormal report through **manager approval**, and recalculates **ROP** (reorder point) and **EOQ** (economic order quantity) weekly from real order data to produce low-stock alerts and a **restock proposal grouped by supplier**, with a priority and a reason for every suggested quantity.

Two roles, two surfaces:
- **Quản lý (Manager)** — desktop. Approves, manages master data, reads alerts, reviews restock proposals and reports. Dense tables, sticky headers, filters, bulk actions.
- **Nhân viên kho (Warehouse staff)** — tablet / phone at the shelves. Scans barcodes, creates receipts/issues, counts stock, reports defects. Big touch targets (≥ 44 px), large scan field, step-by-step flows, minimal typing.

Screens in scope: manager dashboard · goods receipt · goods issue (FIFO) · lot lookup · stocktake · abnormal report · low-stock alerts & restock proposal · stock and in/out reports · master data (products, categories, suppliers, staff accounts).

### Sources
- `uploads/images.jpg` — the only brand asset supplied: white winged emblem + "VIBASIC" wordmark on brand green `#068037`. Copied to `assets/logo-original.jpg`; transparent white/green variants extracted programmatically (pixel threshold, no redrawing).
- The written brief (company description, features, design notes). No codebase, Figma or existing UI was provided, so components and screens are **authored from the brief**, not recreated.

## Index
- `styles.css` — global entry (imports only) → `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/base.css`, `components/components.css`
- `fonts/` — Be Vietnam Pro 400/500/600/700, woff2, vietnamese + latin + latin-ext subsets (Google Fonts, OFL)
- `assets/` — `logo-original.jpg`, `logo-white.png`, `logo-green.png`, `mark-white.png`, `mark-green.png`, `wordmark-white.png`, `wordmark-green.png`, `icons/*.svg` (74 Lucide icons)
- `guidelines/` — foundation specimen cards (colour, type, spacing, radius, elevation, brand)
- `components/` — React primitives (see list below); one `*.card.html` per folder
- `ui_kits/manager/` — desktop dashboard + restock proposal (click-through)
- `ui_kits/warehouse/` — tablet goods-issue FIFO flow (click-through)
- `thumbnail.html` — project tile · `SKILL.md` — agent-skill entry

## Components
Namespace in cards/kits: `window.VibasicDesignSystem_90e71f`.
- **core/** — `Icon` (+ `ICON_NAMES`), `Button`, `IconButton`
- **forms/** — `TextField`, `SelectField`, `Checkbox`, `QuantityStepper`, `ScanInput`
- **status/** — `StatusBadge` (+ `STATUS_META`), `PriorityChip`, `ApprovalStepper`
- **feedback/** — `AlertBanner`, `Toast`, `EmptyState`, `ConfirmDialog`
- **data/** — `DataTable`, `FilterBar`, `KpiTile`, `LotCard`
- **navigation/** — `AppShell` (role `manager` = sidebar; role `staff` = header + bottom tabs)

Pseudo-states (hover / focus / active) live in `components/components.css` as `vb-*` classes; everything else references tokens inline.

---

## CONTENT FUNDAMENTALS
- **Language:** Vietnamese, always with full diacritics. Never strip accents ("Chờ duyệt", not "Cho duyet").
- **Voice:** plain, factual, operational. The system states facts and next actions; it doesn't cheer, apologise or chat. No "Tuyệt vời!", no exclamation marks, no emoji.
- **Address:** neutral/impersonal by default ("Quét mã trên tem sản phẩm."). When addressing the user directly use **bạn** ("Bạn sẽ nhận thông báo khi phiếu được duyệt."). The system never says "tôi".
- **Casing:** sentence case everywhere — titles, buttons, table headers ("Đề xuất nhập hàng", "Tạo đơn đặt hàng"). Uppercase only for tiny overlines and for codes.
- **Buttons are verbs + object:** "Duyệt phiếu", "Từ chối phiếu", "In mã vạch", "Gửi quản lý duyệt", "Xác nhận đã giao". Destructive confirmations repeat the object: "Từ chối phiếu PN-2611-0018?"
- **Domain terms (keep consistent):** phiếu nhập (PN-), phiếu xuất (PX-), phiếu kiểm kê (KK-), báo cáo bất thường (BC-), đơn hàng (DH-), đơn đặt hàng (PO-), lô (LOT-yymm-nnn), sản phẩm/mã SP (SP-SKU-yymm-nnnn), tồn kho, đang về, điểm đặt hàng (ROP), EOQ, nhà cung cấp (NCC).
- **Statuses:** Nháp · Chờ duyệt · Đã duyệt · Từ chối · Tạm hoãn · Lô đã khoá. **Priorities:** Khẩn cấp · Cần đặt · Theo dõi.
- **Numbers:** Vietnamese format — dot thousands, comma decimals (`1.284`, `3,5 ngày`). Always with a unit (cái, tấm, bộ, hộp). Dates `dd/mm/yyyy`, times 24 h `09:14`.
- **Errors say what happened and what to do:** "Sai thứ tự FIFO: lấy hết lô LOT-2609-014 (Kệ B-03) trước." / "Bắt buộc nhập lý do (tối thiểu 5 ký tự)."
- **Reasons are explicit:** every adjusted suggestion explains itself — "Làm tròn EOQ 300 → 350 theo pallet 50 tấm; bù 6 ngày thiếu."

## VISUAL FOUNDATIONS
- **Colour:** white surfaces on a cool grey page (`--grey-50`). Brand green `#068037` (`--green-500`) is reserved for the **primary action**, active navigation, focus ring, success and "approved". It is never a decorative fill except the brand header band (sidebar top / tablet header) where the logo sits. Neutrals are cool grey (`--grey-*`). Semantic statuses: amber = pending, green = approved, red = rejected, slate = on hold, near-black slate (`--slate-900`, inverse) = locked/quarantined lot, blue = info. Priorities: solid red = Khẩn cấp, orange tint = Cần đặt, blue tint = Theo dõi. **Colour is never alone** — every status/priority carries its own icon + label.
- **Type:** Be Vietnam Pro only (400/500/600/700). Manager scale: page 22/30, section 16/24, body 14/20, table 13/18, table head 12/16 600, helper 12/16, KPI 28/34. Warehouse scale: title 24/32, heading 20/28, body 16/24, scan 20/28, qty 32/40. All quantities use `tabular-nums`. Codes get +0.02em tracking and weight 500–600.
- **Spacing:** 4 px base (`--space-1..16`). Manager pages: 24 px gutters, 12–16 px between tiles, 12 px cell padding. Warehouse: 16 px gutters, 56–88 px tap rows.
- **Backgrounds:** flat. No gradients, images, textures, patterns or illustrations inside the app. The only full-bleed colour is the brand green band behind the logo.
- **Corners:** small and crisp — 3 px badges, 4 px controls, 6 px cards/tables, 8 px dialogs. The **angular cue** from the logo's wings appears as a single 6 px **chamfered top-left corner** (`--chamfer`, via `clip-path`) on priority chips, KPI icon tiles, FIFO order numbers and the empty-state icon — and as square-cap / miter-join icon strokes. Never wings, diamonds or logo fragments in UI.
- **Cards:** white, 1 px `--border-default`, 6 px radius, at most `--shadow-1` (a 1–2 px hint). Panels with headers use a 1 px `--border-subtle` divider. No coloured left-border accents, no heavy soft shadows.
- **Elevation:** borders first. Shadows only for things that float: menus/toasts `--shadow-2`, dialogs `--shadow-3` over a 48 % ink overlay. No blur, no glassmorphism, no transparency except the overlay.
- **Tables:** sticky header on `--surface-header` (grey-25), 36 px compact rows (44 default), 1 px hairlines, right-aligned tabular numbers, hover `--grey-25`, selected `--green-50`, supplier group rows on `--grey-50`. A green bulk-action bar appears above the table when rows are selected.
- **Hover:** primary darkens one step (green-600), secondary/ghost get a grey-50/100 fill, clickable cards darken their border. **Press:** one more step darker (green-700 / grey-200). No scale/shrink.
- **Focus:** always visible — 2 px white + 2 px green ring (`--focus-ring`); inputs get a green border + 3 px green-100 halo.
- **Motion:** functional only, 120–240 ms, `cubic-bezier(.2,0,0,1)`. Scan success = green ring pulse; scan error = 4 px horizontal shake; toasts slide 8 px up; progress bars ease width. Respects `prefers-reduced-motion`. No decorative or looping animation.
- **Layout:** manager = fixed 232 px sidebar (green brand band + white nav) + 56 px top bar + scrolling content; warehouse = 64 px green header, content, 56 px bottom tab bar. Touch targets ≥ 44 px (most 56 px) on warehouse screens.
- **Imagery:** none in the product UI. If product photos are ever added, use neutral, evenly lit catalogue shots on white.

## ICONOGRAPHY
- **Set:** [Lucide](https://lucide.dev) (ISC), v0.460.0. 74 icons copied programmatically into `assets/icons/*.svg` and embedded in `components/core/Icon.jsx`. Lucide was chosen as a CDN-available substitute because the brand supplied no icon set — **flagged substitution**.
- **Rendering:** 24 px grid, 2 px stroke, `currentColor`, rendered with **square caps and miter joins** for a slightly sharper, more angular feel echoing the wings.
- **Sizes:** 13–14 px in badges/chips, 16 px in desktop controls and tables, 18 px in navigation, 20–28 px on warehouse/touch screens.
- **Usage:** icons always accompany a label (or have an `aria-label` / `title` in icon-only buttons). Key glyphs: `scan-barcode` (scan), `package-plus/minus` (receipt/issue), `clipboard-check` (approvals), `list-checks` (stocktake), `shield-alert` (abnormal report), `lock` (locked lot), `triangle-alert` (urgent), `shopping-cart` (order), `eye` (watch), `hourglass` (pending), `factory` (supplier).
- **No emoji, no unicode pictographs, no icon font.** The logo emblem is never used as an icon.

## Fonts
Be Vietnam Pro is self-hosted from Google Fonts (OFL), the brief's suggested face. The logo wordmark uses a wide geometric display face that is **not** supplied — it exists only inside the logo images; UI never imitates it.

## Intentional additions
- `Icon` — wrapper for the Lucide glyph set (needed so components share one icon source).
- `Toast` — listed in the brief; included as specified.
