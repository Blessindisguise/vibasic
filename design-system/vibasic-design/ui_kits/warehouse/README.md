# Warehouse UI kit (tablet)

Trial screen for **Nhân viên kho** — goods issue (xuất kho) with FIFO, on a 1180×820 landscape tablet.

Flow: **Chọn đơn → Lấy hàng FIFO → Gửi duyệt → Giao hàng**. Opens mid-task (step 2, 12/24 chairs scanned).

- Scan field accepts real typed codes + Enter (e.g. `SP-GS02-2609-0013`), or use the dashed "Mô phỏng máy quét" bar: correct scan (green flash), wrong lot (FIFO error, shake), locked lot.
- Locked lot `LOT-2608-031` is older but skipped by FIFO.
- **Báo hàng lỗi** requires a description, removes the last scanned unit and adds a replacement to the next lot in FIFO order.
- Review shows the vertical ApprovalStepper; "Mô phỏng: quản lý duyệt" advances to delivery confirmation.

Files: `index.html`, `goods-issue.jsx` (FlowSteps, SelectOrder, PickScreen, Review, Deliver), `warehouse-app.jsx` (shell + tablet frame), `data.js`.
