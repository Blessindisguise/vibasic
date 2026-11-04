// Vibasic sample data — manager desktop kit
window.VB = window.VibasicDesignSystem_90e71f;
window.fmt = (n, d = 0) => n == null ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

window.MGR_NAV = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'layout-dashboard', section: 'Theo dõi' },
  { key: 'alerts', label: 'Cảnh báo', icon: 'bell', count: 5, countTone: 'danger', section: 'Theo dõi' },
  { key: 'restock', label: 'Đề xuất nhập hàng', icon: 'shopping-cart', count: 9, section: 'Theo dõi' },
  { key: 'approvals', label: 'Chờ duyệt', icon: 'clipboard-check', count: 6, section: 'Nghiệp vụ' },
  { key: 'receipts', label: 'Nhập kho', icon: 'package-plus', section: 'Nghiệp vụ' },
  { key: 'issues', label: 'Xuất kho', icon: 'package-minus', section: 'Nghiệp vụ' },
  { key: 'lots', label: 'Tra cứu lô', icon: 'layers', section: 'Nghiệp vụ' },
  { key: 'stocktake', label: 'Kiểm kê', icon: 'list-checks', section: 'Nghiệp vụ' },
  { key: 'abnormal', label: 'Báo cáo bất thường', icon: 'shield-alert', section: 'Nghiệp vụ' },
  { key: 'reports', label: 'Báo cáo', icon: 'chart-column', section: 'Phân tích' },
  { key: 'products', label: 'Sản phẩm', icon: 'boxes', section: 'Danh mục' },
  { key: 'suppliers', label: 'Nhà cung cấp', icon: 'factory', section: 'Danh mục' },
  { key: 'staff', label: 'Tài khoản', icon: 'users', section: 'Danh mục' },
];

window.PENDING = [
  { id: 'PX-2611-0042', type: 'Xuất kho', icon: 'package-minus', by: 'Lê Văn Tâm', at: '03/11 09:14', lines: 3, qty: 34, note: 'Đơn DH-2611-0107 · Nhà hàng Mộc Gia' },
  { id: 'PN-2611-0018', type: 'Nhập kho', icon: 'package-plus', by: 'Phạm Thị Lan', at: '03/11 08:47', lines: 2, qty: 360, note: 'Ván ép Phú Thịnh · QC đạt 358/360' },
  { id: 'BC-2611-0004', type: 'Bất thường', icon: 'shield-alert', by: 'Lê Văn Tâm', at: '03/11 08:05', lines: 1, qty: 3, note: 'Nứt chân ghế · LOT-2608-031' },
  { id: 'KK-2610-0009', type: 'Kiểm kê', icon: 'list-checks', by: 'Trần Quốc Bảo', at: '02/11 17:30', lines: 42, qty: -4, note: 'Khu B · lệch 4 cái' },
  { id: 'PX-2611-0041', type: 'Xuất kho', icon: 'package-minus', by: 'Phạm Thị Lan', at: '02/11 16:02', lines: 1, qty: 12, note: 'Đơn DH-2611-0104 · Showroom Quận 7' },
  { id: 'PN-2611-0017', type: 'Nhập kho', icon: 'package-plus', by: 'Trần Quốc Bảo', at: '02/11 14:21', lines: 4, qty: 1600, note: 'Phụ kiện Tân Á' },
];

window.ALERTS = [
  { tone: 'danger', icon: 'triangle-alert', title: 'Bản lề giảm chấn 35mm còn 4,7 ngày', meta: 'Dưới ROP 395 · NCC giao 5 ngày', time: '06:00' },
  { tone: 'danger', icon: 'triangle-alert', title: 'Ghế ăn gỗ sồi GS-02 còn 3,5 ngày', meta: 'Tồn 14 · ROP 52', time: '06:00' },
  { tone: 'locked', icon: 'lock', title: 'Lô LOT-2608-031 chờ khoá', meta: 'Báo cáo bất thường BC-2611-0004', time: '08:05' },
  { tone: 'warning', icon: 'list-checks', title: 'Kiểm kê khu B lệch −4 cái', meta: 'KK-2610-0009 · cần lý do', time: 'Hôm qua' },
  { tone: 'warning', icon: 'clock', title: 'PO-2610-022 trễ 2 ngày', meta: 'Ván ép Phú Thịnh · 100 tấm', time: 'Hôm qua' },
];

window.MOVEMENT = [
  { d: 'T3', date: '27/10', in: 420, out: 310 }, { d: 'T4', date: '28/10', in: 0, out: 265 }, { d: 'T5', date: '29/10', in: 180, out: 298 },
  { d: 'T6', date: '30/10', in: 640, out: 344 }, { d: 'T7', date: '31/10', in: 0, out: 122 }, { d: 'T2', date: '02/11', in: 360, out: 287 }, { d: 'T3', date: '03/11', in: 0, out: 96 },
];

window.SUPPLIERS = {
  ml: { name: 'Gỗ Minh Long', lead: 10, contact: 'Anh Khoa · 0903 118 245', cat: 'Nội thất gỗ' },
  pt: { name: 'Ván ép Phú Thịnh', lead: 7, contact: 'Chị Ngọc · 0918 402 771', cat: 'Ván & tấm' },
  ta: { name: 'Phụ kiện Tân Á', lead: 5, contact: 'Anh Huy · 0937 650 112', cat: 'Phụ kiện' },
};

// d = nhu cầu TB/ngày (12 tuần), ss = tồn an toàn
window.RESTOCK = [
  { id: 'GS-02', sup: 'ml', name: 'Ghế ăn gỗ sồi', unit: 'cái', stock: 14, inc: 0, d: 4, rop: 52, eoq: 120, p: 'urgent', qty: 160, reason: 'Tăng từ EOQ 120 → 160: tồn hết trước khi hàng về (3,5 < 10 ngày giao).' },
  { id: 'TD-08', sup: 'ml', name: 'Tủ đầu giường gỗ sồi', unit: 'cái', stock: 3, inc: 0, d: 0.6, rop: 9, eoq: 15, p: 'urgent', qty: 18, reason: 'Làm tròn EOQ 15 → 18 theo kiện 6 cái.' },
  { id: 'BA-12', sup: 'ml', name: 'Bàn ăn gỗ óc chó 1m6', unit: 'cái', stock: 9, inc: 4, d: 0.8, rop: 12, eoq: 20, p: 'order', qty: 20, reason: 'Theo EOQ.' },
  { id: 'GT-05', sup: 'ml', name: 'Ghế thư giãn gỗ tần bì', unit: 'cái', stock: 22, inc: 0, d: 1.2, rop: 16, eoq: 30, p: 'watch', qty: 0, reason: 'Trên ROP — chưa cần đặt.' },
  { id: 'VE-18', sup: 'pt', name: 'Ván ép phủ melamine 18mm', unit: 'tấm', stock: 85, inc: 0, d: 14, rop: 138, eoq: 300, p: 'urgent', qty: 350, reason: 'Làm tròn EOQ 300 → 350 theo pallet 50 tấm; bù 6 ngày thiếu.' },
  { id: 'MDF-17', sup: 'pt', name: 'Ván MDF chống ẩm 17mm', unit: 'tấm', stock: 64, inc: 0, d: 6, rop: 60, eoq: 150, p: 'order', qty: 150, reason: 'Theo EOQ.' },
  { id: 'VE-12', sup: 'pt', name: 'Ván ép phủ melamine 12mm', unit: 'tấm', stock: 72, inc: 100, d: 9, rop: 88, eoq: 200, p: 'watch', qty: 0, reason: 'Đã có 100 tấm đang về (PO-2610-022).' },
  { id: 'BL-35', sup: 'ta', name: 'Bản lề giảm chấn 35mm', unit: 'cái', stock: 260, inc: 0, d: 55, rop: 395, eoq: 1200, p: 'urgent', qty: 1400, reason: 'Nhu cầu 4 tuần gần nhất tăng 18% — cộng thêm 200 vào EOQ.' },
  { id: 'RT-45', sup: 'ta', name: 'Ray trượt bi 45cm', unit: 'bộ', stock: 180, inc: 0, d: 20, rop: 150, eoq: 500, p: 'watch', qty: 0, reason: 'Còn 9 ngày, gần ROP — theo dõi.' },
];
