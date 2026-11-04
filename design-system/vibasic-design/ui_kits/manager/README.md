# Manager UI kit (desktop)

Trial screens for the **Quản lý** role at 1440×900.

- `index.html` — click-through. Sidebar nav switches between **Tổng quan** (dashboard) and **Đề xuất nhập hàng** (restock proposal); other nav items show an "out of scope" empty state.
- `dashboard.jsx` — KPI row, pending-approval table with Duyệt / Từ chối (reject requires a reason → toast with Hoàn tác), active alerts, below-ROP list, 7-day in/out chart.
- `restock.jsx` — priority summary tabs, FilterBar, DataTable grouped by supplier with stock / incoming / ROP / EOQ / days-left / priority / editable suggested qty / adjustment reason; bulk "Tạo đơn đặt hàng".
- `data.js` — sample data (wood-furniture SKUs, 3 suppliers).

All primitives come from the design-system bundle (`window.VibasicDesignSystem_90e71f`). Kit-local pieces: `Panel`, `MovementChart`, `DaysCell`, `QtyInput`.
