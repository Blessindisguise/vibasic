Action button — one primary (green) per view; secondary for alternates, ghost for low-emphasis, danger for reject/delete.
```jsx
<Button variant="primary" icon="check">Duyệt phiếu</Button>
<Button variant="danger-outline" icon="x">Từ chối</Button>
<Button size="xl" fullWidth icon="send">Gửi duyệt</Button>
```
- Manager screens: `md` (36px). Warehouse screens: `lg`/`xl` (44/56px touch).
- Labels are verbs in sentence case: "Tạo phiếu nhập", "In mã vạch".
