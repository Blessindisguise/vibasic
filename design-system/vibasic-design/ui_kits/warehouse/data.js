// Vibasic sample data — warehouse tablet kit
window.VB = window.VibasicDesignSystem_90e71f;

window.STAFF_NAV = [
  { key: 'issue', label: 'Xuất kho', icon: 'package-minus' },
  { key: 'receipt', label: 'Nhập kho', icon: 'package-plus' },
  { key: 'lookup', label: 'Tra cứu lô', icon: 'layers' },
  { key: 'stocktake', label: 'Kiểm kê', icon: 'list-checks', count: 1 },
  { key: 'abnormal', label: 'Báo lỗi', icon: 'shield-alert' },
];

window.ORDERS = [
  { id: 'DH-2611-0107', customer: 'Nhà hàng Mộc Gia', due: 'Giao 04/11 · 08:00', lines: 3, qty: 34, urgent: true },
  { id: 'DH-2611-0109', customer: 'Showroom Quận 7', due: 'Giao 04/11 · 14:00', lines: 2, qty: 18 },
  { id: 'DH-2611-0112', customer: 'Khách sạn Lá Phong', due: 'Giao 05/11', lines: 5, qty: 120 },
];

// FIFO lots per line, oldest first. Locked lots are skipped by the system.
const mk = (sku, lot, n, start = 1) => Array.from({ length: n }, (_, i) => `SP-${sku}-${lot.slice(4)}-${String(start + i).padStart(4, '0')}`);
window.ISSUE_LINES = [
  { sku: 'GS-02', name: 'Ghế ăn gỗ sồi', unit: 'cái', qty: 24, lots: [
    { lot: 'LOT-2608-031', received: '28/08/2026', age: 67, loc: 'Kệ B-04', available: 18, locked: true },
    { lot: 'LOT-2609-014', received: '14/09/2026', age: 50, loc: 'Kệ B-03', available: 20, take: 20, items: mk('GS02', 'LOT-2609-014', 20, 1) },
    { lot: 'LOT-2610-006', received: '06/10/2026', age: 28, loc: 'Kệ B-05', available: 40, take: 4, items: mk('GS02', 'LOT-2610-006', 4, 1) },
  ] },
  { sku: 'BA-12', name: 'Bàn ăn gỗ óc chó 1m6', unit: 'cái', qty: 4, lots: [
    { lot: 'LOT-2609-022', received: '19/09/2026', age: 45, loc: 'Khu D-01', available: 6, take: 4, items: mk('BA12', 'LOT-2609-022', 4, 3) },
  ] },
  { sku: 'TD-08', name: 'Tủ đầu giường gỗ sồi', unit: 'cái', qty: 6, lots: [
    { lot: 'LOT-2607-040', received: '22/07/2026', age: 104, loc: 'Kệ C-02', available: 2, take: 2, items: mk('TD08', 'LOT-2607-040', 2, 9) },
    { lot: 'LOT-2609-031', received: '27/09/2026', age: 37, loc: 'Kệ C-02', available: 10, take: 4, items: mk('TD08', 'LOT-2609-031', 4, 1) },
  ] },
];
window.DEFECT_CODE = 'SP-GS02-2609-0007';
