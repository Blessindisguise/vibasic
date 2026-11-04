/* @ds-bundle: {"format":4,"namespace":"VibasicDesignSystem_90e71f","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"FilterBar","sourcePath":"components/data/FilterBar.jsx"},{"name":"KpiTile","sourcePath":"components/data/KpiTile.jsx"},{"name":"LotCard","sourcePath":"components/data/LotCard.jsx"},{"name":"AlertBanner","sourcePath":"components/feedback/AlertBanner.jsx"},{"name":"ConfirmDialog","sourcePath":"components/feedback/ConfirmDialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"QuantityStepper","sourcePath":"components/forms/QuantityStepper.jsx"},{"name":"ScanInput","sourcePath":"components/forms/ScanInput.jsx"},{"name":"SelectField","sourcePath":"components/forms/SelectField.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"AppShell","sourcePath":"components/navigation/AppShell.jsx"},{"name":"ApprovalStepper","sourcePath":"components/status/ApprovalStepper.jsx"},{"name":"PriorityChip","sourcePath":"components/status/PriorityChip.jsx"},{"name":"STATUS_META","sourcePath":"components/status/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/status/StatusBadge.jsx"}],"sourceHashes":{"components/core/Button.jsx":"745442e453bd","components/core/Icon.jsx":"a5e1f51001eb","components/core/IconButton.jsx":"37bdb74d6df2","components/data/DataTable.jsx":"e2017d714c89","components/data/FilterBar.jsx":"6fe3cbf4da07","components/data/KpiTile.jsx":"bc5de097aa52","components/data/LotCard.jsx":"b510404578a6","components/feedback/AlertBanner.jsx":"d292c855ed43","components/feedback/ConfirmDialog.jsx":"50300251d222","components/feedback/EmptyState.jsx":"554ec521d92d","components/feedback/Toast.jsx":"03f73793ef89","components/forms/Checkbox.jsx":"da6611f5b228","components/forms/QuantityStepper.jsx":"9761c03981a1","components/forms/ScanInput.jsx":"9869d70438e1","components/forms/SelectField.jsx":"6408edacda6c","components/forms/TextField.jsx":"bd64fec0d89d","components/navigation/AppShell.jsx":"dfe3ae57d9ea","components/status/ApprovalStepper.jsx":"f6597580cd50","components/status/PriorityChip.jsx":"1510de719fe5","components/status/StatusBadge.jsx":"c938a7d4424f","ui_kits/manager/dashboard.jsx":"7b17c48df974","ui_kits/manager/data.js":"8de95603f151","ui_kits/manager/manager-app.jsx":"a6d44053f1ee","ui_kits/manager/restock.jsx":"22a163946005","ui_kits/warehouse/data.js":"a8bec723749a","ui_kits/warehouse/goods-issue.jsx":"1b1dcc92ec81","ui_kits/warehouse/warehouse-app.jsx":"8bb4894722c5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.VibasicDesignSystem_90e71f = window.VibasicDesignSystem_90e71f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Icon.jsx
try { (() => {
// Icon paths copied programmatically from lucide-static@0.460.0 (ISC). Raw SVGs live in assets/icons/.
// Vibasic renders them with square caps + miter joins for a subtle angular cue from the logo's wings.
const ICONS = {
  "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\" /><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\" />",
  "package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\" /><path d=\"M12 22V12\" /><path d=\"m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7\" /><path d=\"m7.5 4.27 9 5.15\" />",
  "package-plus": "<path d=\"M16 16h6\" /><path d=\"M19 13v6\" /><path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\" /><path d=\"m7.5 4.27 9 5.15\" /><polyline points=\"3.29 7 12 12 20.71 7\" /><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\" />",
  "package-minus": "<path d=\"M16 16h6\" /><path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\" /><path d=\"m7.5 4.27 9 5.15\" /><polyline points=\"3.29 7 12 12 20.71 7\" /><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\" />",
  "package-check": "<path d=\"m16 16 2 2 4-4\" /><path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\" /><path d=\"m7.5 4.27 9 5.15\" /><polyline points=\"3.29 7 12 12 20.71 7\" /><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\" />",
  "package-x": "<path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\" /><path d=\"m7.5 4.27 9 5.15\" /><polyline points=\"3.29 7 12 12 20.71 7\" /><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\" /><path d=\"m17 13 5 5m-5 0 5-5\" />",
  "boxes": "<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\" /><path d=\"m7 16.5-4.74-2.85\" /><path d=\"m7 16.5 5-3\" /><path d=\"M7 16.5v5.17\" /><path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\" /><path d=\"m17 16.5-5-3\" /><path d=\"m17 16.5 4.74-2.85\" /><path d=\"M17 16.5v5.17\" /><path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\" /><path d=\"M12 8 7.26 5.15\" /><path d=\"m12 8 4.74-2.85\" /><path d=\"M12 13.5V8\" />",
  "scan-barcode": "<path d=\"M3 7V5a2 2 0 0 1 2-2h2\" /><path d=\"M17 3h2a2 2 0 0 1 2 2v2\" /><path d=\"M21 17v2a2 2 0 0 1-2 2h-2\" /><path d=\"M7 21H5a2 2 0 0 1-2-2v-2\" /><path d=\"M8 7v10\" /><path d=\"M12 7v10\" /><path d=\"M17 7v10\" />",
  "barcode": "<path d=\"M3 5v14\" /><path d=\"M8 5v14\" /><path d=\"M12 5v14\" /><path d=\"M17 5v14\" /><path d=\"M21 5v14\" />",
  "clipboard-check": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /><path d=\"m9 14 2 2 4-4\" />",
  "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\" /><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\" /><path d=\"M12 11h4\" /><path d=\"M12 16h4\" /><path d=\"M8 11h.01\" /><path d=\"M8 16h.01\" />",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /><path d=\"M12 9v4\" /><path d=\"M12 17h.01\" />",
  "octagon-alert": "<path d=\"M12 16h.01\" /><path d=\"M12 8v4\" /><path d=\"M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z\" />",
  "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\" /><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\" />",
  "truck": "<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /><path d=\"M15 18H9\" /><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\" /><circle cx=\"17\" cy=\"18\" r=\"2\" /><circle cx=\"7\" cy=\"18\" r=\"2\" />",
  "factory": "<path d=\"M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z\" /><path d=\"M17 18h1\" /><path d=\"M12 18h1\" /><path d=\"M7 18h1\" />",
  "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\" /><circle cx=\"9\" cy=\"7\" r=\"4\" /><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\" /><path d=\"M16 3.13a4 4 0 0 1 0 7.75\" />",
  "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /><circle cx=\"12\" cy=\"7\" r=\"4\" />",
  "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /><path d=\"M18 17V9\" /><path d=\"M13 17V5\" /><path d=\"M8 17v-3\" />",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" /><path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /><path d=\"M10 9H8\" /><path d=\"M16 13H8\" /><path d=\"M16 17H8\" />",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" /><path d=\"m21 21-4.3-4.3\" />",
  "filter": "<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\" />",
  "x": "<path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" />",
  "check": "<path d=\"M20 6 9 17l-5-5\" />",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\" />",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\" />",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\" />",
  "chevron-up": "<path d=\"m18 15-6-6-6 6\" />",
  "plus": "<path d=\"M5 12h14\" /><path d=\"M12 5v14\" />",
  "minus": "<path d=\"M5 12h14\" />",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /><path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />",
  "lock-open": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /><path d=\"M7 11V7a5 5 0 0 1 9.9-1\" />",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /><circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "shopping-cart": "<circle cx=\"8\" cy=\"21\" r=\"1\" /><circle cx=\"19\" cy=\"21\" r=\"1\" /><path d=\"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12\" />",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><polyline points=\"12 6 12 12 16 14\" />",
  "calendar": "<path d=\"M8 2v4\" /><path d=\"M16 2v4\" /><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /><path d=\"M3 10h18\" />",
  "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /><polyline points=\"7 10 12 15 17 10\" /><line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\" />",
  "printer": "<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\" /><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\" /><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\" />",
  "refresh-cw": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /><path d=\"M21 3v5h-5\" /><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /><path d=\"M8 16H3v5\" />",
  "arrow-up-right": "<path d=\"M7 7h10v10\" /><path d=\"M7 17 17 7\" />",
  "arrow-down-left": "<path d=\"M17 7 7 17\" /><path d=\"M17 17H7V7\" />",
  "arrow-right": "<path d=\"M5 12h14\" /><path d=\"m12 5 7 7-7 7\" />",
  "ellipsis": "<circle cx=\"12\" cy=\"12\" r=\"1\" /><circle cx=\"19\" cy=\"12\" r=\"1\" /><circle cx=\"5\" cy=\"12\" r=\"1\" />",
  "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\" /><polyline points=\"16 17 21 12 16 7\" /><line x1=\"21\" x2=\"9\" y1=\"12\" y2=\"12\" />",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m9 12 2 2 4-4\" />",
  "circle-x": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m15 9-6 6\" /><path d=\"m9 9 6 6\" />",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 16v-4\" /><path d=\"M12 8h.01\" />",
  "layers": "<path d=\"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z\" /><path d=\"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65\" /><path d=\"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65\" />",
  "tag": "<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\" /><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />",
  "history": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /><path d=\"M3 3v5h5\" /><path d=\"M12 7v5l4 2\" />",
  "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"m4.9 4.9 14.2 14.2\" />",
  "circle-pause": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><line x1=\"10\" x2=\"10\" y1=\"15\" y2=\"9\" /><line x1=\"14\" x2=\"14\" y1=\"15\" y2=\"9\" />",
  "square-pen": "<path d=\"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\" /><path d=\"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z\" />",
  "trash-2": "<path d=\"M3 6h18\" /><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\" /><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\" /><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\" /><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\" />",
  "warehouse": "<path d=\"M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z\" /><path d=\"M6 18h12\" /><path d=\"M6 14h12\" /><rect width=\"12\" height=\"12\" x=\"6\" y=\"10\" />",
  "list-checks": "<path d=\"m3 17 2 2 4-4\" /><path d=\"m3 7 2 2 4-4\" /><path d=\"M13 6h8\" /><path d=\"M13 12h8\" /><path d=\"M13 18h8\" />",
  "undo-2": "<path d=\"M9 14 4 9l5-5\" /><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\" />",
  "send": "<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\" /><path d=\"m21.854 2.147-10.94 10.939\" />",
  "sliders-horizontal": "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" /><line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" /><line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" /><line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" /><line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" /><line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" /><line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" /><line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" /><line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />",
  "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /><line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /><line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />",
  "camera": "<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\" /><circle cx=\"12\" cy=\"13\" r=\"3\" />",
  "keyboard": "<path d=\"M10 8h.01\" /><path d=\"M12 12h.01\" /><path d=\"M14 8h.01\" /><path d=\"M16 12h.01\" /><path d=\"M18 8h.01\" /><path d=\"M6 8h.01\" /><path d=\"M7 16h10\" /><path d=\"M8 12h.01\" /><rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" />",
  "arrow-up-down": "<path d=\"m21 16-4 4-4-4\" /><path d=\"M17 20V4\" /><path d=\"m3 8 4-4 4 4\" /><path d=\"M7 4v16\" />",
  "circle-help": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\" /><path d=\"M12 17h.01\" />",
  "hourglass": "<path d=\"M5 22h14\" /><path d=\"M5 2h14\" /><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\" /><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\" />",
  "shield-alert": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /><path d=\"M12 8v4\" /><path d=\"M12 16h.01\" />",
  "replace": "<path d=\"M14 4a2 2 0 0 1 2-2\" /><path d=\"M16 10a2 2 0 0 1-2-2\" /><path d=\"M20 2a2 2 0 0 1 2 2\" /><path d=\"M22 8a2 2 0 0 1-2 2\" /><path d=\"m3 7 3 3 3-3\" /><path d=\"M6 10V5a3 3 0 0 1 3-3h1\" /><rect x=\"2\" y=\"14\" width=\"8\" height=\"8\" rx=\"2\" />",
  "trending-down": "<polyline points=\"22 17 13.5 8.5 8.5 13.5 2 7\" /><polyline points=\"16 17 22 17 22 11\" />",
  "trending-up": "<polyline points=\"22 7 13.5 15.5 8.5 10.5 2 17\" /><polyline points=\"16 7 22 7 22 13\" />",
  "folder-tree": "<path d=\"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z\" /><path d=\"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z\" /><path d=\"M3 5a2 2 0 0 0 2 2h3\" /><path d=\"M3 3v13a2 2 0 0 0 2 2h3\" />",
  "building-2": "<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\" /><path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\" /><path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\" /><path d=\"M10 6h4\" /><path d=\"M10 10h4\" /><path d=\"M10 14h4\" /><path d=\"M10 18h4\" />",
  "circle-dot": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><circle cx=\"12\" cy=\"12\" r=\"1\" />",
  "file-check": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\" /><path d=\"M14 2v4a2 2 0 0 0 2 2h4\" /><path d=\"m9 15 2 2 4-4\" />"
};
const ICON_NAMES = Object.keys(ICONS);
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  title,
  style,
  ...rest
}) {
  const body = ICONS[name];
  if (!body) return null;
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'square',
    strokeLinejoin: 'miter',
    role: title ? 'img' : undefined,
    'aria-hidden': title ? undefined : true,
    'aria-label': title,
    style: {
      flex: 'none',
      display: 'block',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: body
    },
    ...rest
  });
}
Object.assign(__ds_scope, { ICON_NAMES, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICON_SIZE = {
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  children,
  className = '',
  ...rest
}) {
  const is = ICON_SIZE[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled || loading,
    "aria-busy": loading || undefined,
    className: `vb-btn vb-btn--${variant} vb-btn--${size}${fullWidth ? ' vb-btn--full' : ''} ${className}`
  }, rest), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "refresh-cw",
    size: is
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: is
  }) : null, children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: is
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICON_SIZE = {
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22
};
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  badge,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    className: `vb-btn vb-btn--${variant} vb-btn--${size} vb-btn--icon ${className}`,
    style: {
      position: 'relative'
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: ICON_SIZE[size]
  }), badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--red-600)',
      color: '#fff',
      font: '600 11px/18px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums',
      boxShadow: '0 0 0 2px #fff'
    }
  }, badge));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
// columns: [{ key, header, align: 'left'|'right'|'center', numeric, width, render(row), sortable }]
// groupBy: optional key; renders a full-width group header row (e.g. supplier) with groupHeader(groupValue, rows).
function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  density = 'compact',
  selectable = false,
  selected = [],
  onSelectedChange,
  bulkActions,
  maxHeight,
  groupBy,
  groupHeader,
  onRowClick,
  sort,
  onSortChange,
  empty,
  caption
}) {
  const allIds = rows.map(r => r[rowKey]);
  const allOn = selectable && allIds.length > 0 && allIds.every(id => selected.includes(id));
  const someOn = selectable && selected.length > 0 && !allOn;
  const headRef = React.useRef(null);
  React.useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = someOn;
  }, [someOn]);
  const toggle = id => onSelectedChange && onSelectedChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const toggleAll = () => onSelectedChange && onSelectedChange(allOn ? [] : allIds);
  const colCount = columns.length + (selectable ? 1 : 0);
  const groups = [];
  if (groupBy) {
    const m = new Map();
    rows.forEach(r => {
      const g = r[groupBy];
      if (!m.has(g)) {
        m.set(g, []);
        groups.push([g, m.get(g)]);
      }
      m.get(g).push(r);
    });
  } else groups.push([null, rows]);
  const renderRow = r => {
    const id = r[rowKey];
    const on = selected.includes(id);
    return /*#__PURE__*/React.createElement("tr", {
      key: id,
      "aria-selected": selectable ? on : undefined,
      onClick: onRowClick ? () => onRowClick(r) : undefined,
      style: {
        cursor: onRowClick ? 'pointer' : undefined
      }
    }, selectable && /*#__PURE__*/React.createElement("td", {
      className: "sel",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("label", {
      className: "vb-check"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: on,
      onChange: () => toggle(id),
      "aria-label": "Ch\u1ECDn d\xF2ng"
    }))), columns.map(c => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      className: c.numeric || c.align === 'right' ? 'num' : '',
      style: {
        textAlign: c.align === 'center' ? 'center' : undefined,
        width: c.width
      }
    }, c.render ? c.render(r) : r[c.key])));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0
    }
  }, selectable && selected.length > 0 && bulkActions && /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": "Thao t\xE1c h\xE0ng lo\u1EA1t",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 44,
      padding: '0 8px 0 14px',
      background: 'var(--green-50)',
      border: '1px solid var(--green-200)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--green-800)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "\u0110\xE3 ch\u1ECDn ", selected.length), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--ghost vb-btn--sm",
    onClick: () => onSelectedChange([])
  }, "B\u1ECF ch\u1ECDn"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, bulkActions)), /*#__PURE__*/React.createElement("div", {
    className: "vb-table-wrap",
    style: {
      maxHeight
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: `vb-table vb-table--${density}`
  }, caption && /*#__PURE__*/React.createElement("caption", {
    style: {
      position: 'absolute',
      left: -9999
    }
  }, caption), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, selectable && /*#__PURE__*/React.createElement("th", {
    className: "sel"
  }, /*#__PURE__*/React.createElement("label", {
    className: "vb-check"
  }, /*#__PURE__*/React.createElement("input", {
    ref: headRef,
    type: "checkbox",
    checked: allOn,
    onChange: toggleAll,
    "aria-label": "Ch\u1ECDn t\u1EA5t c\u1EA3"
  }))), columns.map(c => {
    const active = sort && sort.key === c.key;
    return /*#__PURE__*/React.createElement("th", {
      key: c.key,
      className: c.numeric || c.align === 'right' ? 'num' : '',
      style: {
        width: c.width,
        textAlign: c.align === 'center' ? 'center' : undefined
      },
      "aria-sort": active ? sort.dir === 'asc' ? 'ascending' : 'descending' : undefined
    }, c.sortable ? /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "vb-sort",
      onClick: () => onSortChange && onSortChange({
        key: c.key,
        dir: active && sort.dir === 'desc' ? 'asc' : 'desc'
      }),
      style: {
        color: active ? 'var(--text-primary)' : undefined
      }
    }, c.header, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: active ? sort.dir === 'asc' ? 'chevron-up' : 'chevron-down' : 'arrow-up-down',
      size: 12
    })) : c.header);
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: colCount,
    style: {
      height: 'auto'
    }
  }, empty || /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24,
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }
  }, "Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u"))), groups.map(([g, rs]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: String(g)
  }, groupBy && /*#__PURE__*/React.createElement("tr", {
    className: "vb-group"
  }, /*#__PURE__*/React.createElement("td", {
    colSpan: colCount
  }, groupHeader ? groupHeader(g, rs) : g)), rs.map(renderRow)))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/FilterBar.jsx
try { (() => {
// filters: [{ key, label, value, options: [{value,label}] }] · chips: [{ key, label }]
function FilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Tìm theo mã, tên sản phẩm…',
  filters = [],
  onFilterChange,
  chips = [],
  onRemoveChip,
  onClearAll,
  actions,
  resultCount
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "vb-input vb-input--md",
    style: {
      width: 280,
      maxWidth: '100%'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--text-muted)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: search,
    onChange: e => onSearchChange && onSearchChange(e.target.value),
    placeholder: searchPlaceholder,
    "aria-label": "T\xECm ki\u1EBFm"
  })), filters.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.key,
    className: "vb-input vb-input--md",
    style: {
      position: 'relative',
      paddingRight: 28,
      background: f.value ? 'var(--green-50)' : '#fff',
      borderColor: f.value ? 'var(--green-300)' : undefined
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, f.label, ":"), /*#__PURE__*/React.createElement("select", {
    value: f.value || '',
    onChange: e => onFilterChange && onFilterChange(f.key, e.target.value),
    "aria-label": f.label,
    style: {
      fontWeight: 600,
      paddingRight: 0,
      width: 'auto'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\u1EA5t c\u1EA3"), f.options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      position: 'absolute',
      right: 10,
      pointerEvents: 'none',
      color: 'var(--text-secondary)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, resultCount != null && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, resultCount, " k\u1EBFt qu\u1EA3"), actions)), chips.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, chips.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.key,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: 26,
      padding: '0 4px 0 8px',
      background: 'var(--grey-100)',
      borderRadius: 'var(--radius-sm)',
      font: '500 12px/16px var(--font-sans)',
      color: 'var(--grey-800)'
    }
  }, c.label, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-chip-remove",
    "aria-label": `Bỏ lọc ${c.label}`,
    onClick: () => onRemoveChip && onRemoveChip(c.key)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })))), onClearAll && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--ghost vb-btn--sm",
    onClick: onClearAll
  }, "Xo\xE1 b\u1ED9 l\u1ECDc")));
}
Object.assign(__ds_scope, { FilterBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/FilterBar.jsx", error: String((e && e.message) || e) }); }

// components/data/KpiTile.jsx
try { (() => {
const TONE = {
  neutral: ['var(--grey-50)', 'var(--grey-600)'],
  danger: ['var(--red-50)', 'var(--red-600)'],
  warning: ['var(--amber-50)', 'var(--amber-700)'],
  success: ['var(--green-50)', 'var(--green-600)'],
  info: ['var(--blue-50)', 'var(--blue-700)']
};

// delta: { value: '+12%', direction: 'up'|'down', good: boolean }
function KpiTile({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
  delta,
  footnote,
  onClick,
  actionLabel
}) {
  const [bg, fg] = TONE[tone] || TONE.neutral;
  const Tag = onClick ? 'button' : 'div';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    onClick: onClick,
    className: onClick ? 'vb-clickable' : undefined,
    style: {
      all: onClick ? 'unset' : undefined,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 16,
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-card)',
      minWidth: 0,
      textAlign: 'left',
      cursor: onClick ? 'pointer' : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      display: 'grid',
      placeItems: 'center',
      background: bg,
      color: fg,
      clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-secondary)',
      flex: 1,
      minWidth: 0
    }
  }, label), onClick && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 16,
    style: {
      color: 'var(--text-muted)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-kpi)',
      fontVariantNumeric: 'tabular-nums',
      color: tone === 'danger' ? 'var(--red-700)' : 'var(--text-primary)'
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)'
    }
  }, unit), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      font: '600 12px/16px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums',
      color: delta.good ? 'var(--green-700)' : 'var(--red-700)',
      marginLeft: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: delta.direction === 'down' ? 'trending-down' : 'trending-up',
    size: 14
  }), delta.value)), footnote && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, footnote));
}
Object.assign(__ds_scope, { KpiTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KpiTile.jsx", error: String((e && e.message) || e) }); }

// components/feedback/AlertBanner.jsx
try { (() => {
const TONE = {
  info: {
    icon: 'info',
    fg: 'var(--status-info-fg)',
    bg: 'var(--status-info-bg)',
    bd: 'var(--status-info-border)',
    ic: 'var(--blue-500)'
  },
  warning: {
    icon: 'triangle-alert',
    fg: 'var(--amber-700)',
    bg: 'var(--amber-50)',
    bd: 'var(--amber-200)',
    ic: 'var(--amber-700)'
  },
  danger: {
    icon: 'octagon-alert',
    fg: 'var(--red-700)',
    bg: 'var(--red-50)',
    bd: 'var(--red-200)',
    ic: 'var(--red-600)'
  },
  success: {
    icon: 'circle-check',
    fg: 'var(--green-800)',
    bg: 'var(--green-50)',
    bd: 'var(--green-200)',
    ic: 'var(--green-600)'
  }
};
function AlertBanner({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  icon
}) {
  const t = TONE[tone] || TONE.info;
  return /*#__PURE__*/React.createElement("div", {
    role: tone === 'danger' ? 'alert' : 'status',
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      background: t.bg,
      border: `1px solid ${t.bd}`,
      borderRadius: 'var(--radius-md)',
      color: t.fg
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 20,
    style: {
      color: t.ic,
      marginTop: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      font: 'var(--type-body)'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      opacity: .9
    }
  }, children)), action && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      alignSelf: 'center'
    }
  }, action), onDismiss && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-chip-remove",
    "aria-label": "\u0110\xF3ng",
    onClick: onDismiss,
    style: {
      width: 24,
      height: 24
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  })));
}
Object.assign(__ds_scope, { AlertBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/AlertBanner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmDialog.jsx
try { (() => {
// Approve/reject confirmation. When requireReason is true, confirm is blocked until a reason (≥ minReason chars) is entered.
function ConfirmDialog({
  open = true,
  tone = 'primary',
  title,
  description,
  children,
  requireReason = false,
  reasonLabel = 'Lý do',
  reasonPlaceholder = 'Nhập lý do để người lập phiếu biết cần sửa gì…',
  minReason = 5,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  onConfirm,
  onCancel,
  inline = false
}) {
  const [reason, setReason] = React.useState('');
  const [tried, setTried] = React.useState(false);
  if (!open) return null;
  const invalid = requireReason && reason.trim().length < minReason;
  const danger = tone === 'danger';
  const submit = () => {
    setTried(true);
    if (!invalid) onConfirm && onConfirm(reason.trim());
  };
  const dialog = /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": !inline,
    "aria-labelledby": "vb-dlg-t",
    style: {
      width: 480,
      maxWidth: '100%',
      background: '#fff',
      borderRadius: 'var(--radius-dialog)',
      boxShadow: 'var(--elevation-dialog)',
      overflow: 'hidden',
      border: inline ? '1px solid var(--border-default)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      padding: '20px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      background: danger ? 'var(--red-50)' : 'var(--green-50)',
      color: danger ? 'var(--red-600)' : 'var(--green-600)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: danger ? 'circle-x' : 'circle-check',
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    id: "vb-dlg-t",
    style: {
      font: 'var(--type-section-title)',
      fontSize: 17
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      marginTop: 4,
      textWrap: 'pretty'
    }
  }, description))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px 0 70px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, children, requireReason && /*#__PURE__*/React.createElement("div", {
    className: "vb-field"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "vb-dlg-r",
    className: "vb-field__label"
  }, reasonLabel, /*#__PURE__*/React.createElement("span", {
    className: "req",
    "aria-hidden": "true"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: `vb-input vb-input--textarea${tried && invalid ? ' vb-input--error' : ''}`
  }, /*#__PURE__*/React.createElement("textarea", {
    id: "vb-dlg-r",
    value: reason,
    onChange: e => setReason(e.target.value),
    placeholder: reasonPlaceholder,
    "aria-invalid": tried && invalid || undefined
  })), /*#__PURE__*/React.createElement("div", {
    className: `vb-field__help${tried && invalid ? ' vb-field__help--error' : ''}`
  }, tried && invalid ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-x",
    size: 14,
    style: {
      marginTop: 1
    }
  }), "B\u1EAFt bu\u1ED9c nh\u1EADp l\xFD do (t\u1ED1i thi\u1EC3u ", minReason, " k\xFD t\u1EF1).") : 'Lý do sẽ được lưu vào lịch sử phiếu.'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: 20,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--secondary vb-btn--md",
    onClick: onCancel
  }, cancelLabel), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: `vb-btn vb-btn--${danger ? 'danger' : 'primary'} vb-btn--md`,
    onClick: submit
  }, confirmLabel)));
  if (inline) return dialog;
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => e.target === e.currentTarget && onCancel && onCancel(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 'var(--z-dialog)',
      background: 'var(--surface-overlay)',
      display: 'grid',
      placeItems: 'center',
      padding: 16
    }
  }, dialog);
}
Object.assign(__ds_scope, { ConfirmDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmDialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function EmptyState({
  icon = 'package',
  title,
  description,
  action,
  size = 'md'
}) {
  const lg = size === 'lg';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 12,
      padding: lg ? '48px 24px' : '32px 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: lg ? 56 : 44,
      height: lg ? 56 : 44,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--grey-50)',
      border: '1px solid var(--border-default)',
      color: 'var(--grey-500)',
      clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: lg ? 26 : 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: lg ? 'var(--type-touch-heading)' : 'var(--type-section-title)',
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      font: lg ? 'var(--type-touch-body)' : 'var(--type-body)',
      color: 'var(--text-secondary)',
      maxWidth: 400,
      textWrap: 'pretty'
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONE = {
  success: ['circle-check', 'var(--green-300)'],
  danger: ['circle-x', '#F59E96'],
  info: ['info', '#9CC3F2'],
  warning: ['triangle-alert', 'var(--amber-200)']
};
function Toast({
  tone = 'success',
  title,
  message,
  action,
  onClose
}) {
  const [icon, ic] = TONE[tone] || TONE.info;
  return /*#__PURE__*/React.createElement("div", {
    className: "vb-toast",
    role: "status",
    "aria-live": "polite",
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      width: 360,
      maxWidth: '100%',
      padding: '12px 12px 12px 14px',
      background: 'var(--surface-inverse)',
      color: '#fff',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-toast)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    style: {
      color: ic
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)'
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--grey-300)',
      marginTop: 2
    }
  }, message)), action && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: action.onClick,
    style: {
      all: 'unset',
      cursor: 'pointer',
      font: '600 13px/20px var(--font-sans)',
      color: 'var(--green-200)',
      padding: '0 4px'
    }
  }, action.label), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "\u0110\xF3ng",
    onClick: onClose,
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--grey-400)',
      display: 'grid',
      placeItems: 'center',
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked,
  indeterminate = false,
  size = 'md',
  onChange,
  disabled,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return /*#__PURE__*/React.createElement("label", {
    className: `vb-check${size === 'lg' ? ' vb-check--lg' : ''}`,
    style: size === 'lg' ? {
      minHeight: 'var(--touch-min)'
    } : undefined
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: "checkbox",
    checked: !!checked,
    onChange: onChange,
    disabled: disabled,
    "aria-label": typeof label === 'string' ? undefined : rest['aria-label']
  }, rest)), label && /*#__PURE__*/React.createElement("span", {
    style: {
      color: disabled ? 'var(--text-disabled)' : undefined
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/QuantityStepper.jsx
try { (() => {
function QuantityStepper({
  value = 0,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  unit,
  size = 'md',
  label,
  disabled = false
}) {
  const lg = size === 'lg';
  const h = lg ? 'var(--control-xl)' : 'var(--control-md)';
  const set = v => onChange && onChange(Math.max(min, Math.min(max, v)));
  const btn = (dir, dis) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--secondary vb-btn--icon",
    disabled: disabled || dis,
    "aria-label": dir < 0 ? 'Giảm' : 'Tăng',
    onClick: () => set(value + dir * step),
    style: {
      height: h,
      borderRadius: dir < 0 ? 'var(--radius-control) 0 0 var(--radius-control)' : '0 var(--radius-control) var(--radius-control) 0'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: dir < 0 ? 'minus' : 'plus',
    size: lg ? 22 : 16
  }));
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": label || 'Số lượng',
    style: {
      display: 'inline-flex',
      alignItems: 'stretch'
    }
  }, btn(-1, value <= min), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      height: h,
      borderTop: '1px solid var(--border-strong)',
      borderBottom: '1px solid var(--border-strong)',
      background: disabled ? 'var(--grey-50)' : '#fff',
      padding: '0 8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    value: value,
    disabled: disabled,
    "aria-label": label || 'Số lượng',
    onChange: e => {
      const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
      set(isNaN(n) ? min : n);
    },
    style: {
      width: lg ? 64 : 44,
      border: 0,
      outline: 0,
      background: 'transparent',
      textAlign: 'center',
      font: lg ? 'var(--type-touch-heading)' : 'var(--type-body-strong)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-primary)'
    }
  }), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      font: lg ? 'var(--type-touch-body)' : 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, unit)), btn(1, value >= max));
}
Object.assign(__ds_scope, { QuantityStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/QuantityStepper.jsx", error: String((e && e.message) || e) }); }

// components/forms/ScanInput.jsx
try { (() => {
const MSG = {
  success: {
    icon: 'circle-check',
    color: 'var(--green-700)'
  },
  error: {
    icon: 'circle-x',
    color: 'var(--red-700)'
  },
  idle: {
    icon: 'info',
    color: 'var(--text-secondary)'
  }
};
function ScanInput({
  value = '',
  onChange,
  onSubmit,
  state = 'idle',
  message,
  label = 'Quét mã vạch',
  placeholder = 'Quét hoặc nhập mã…',
  onCamera,
  autoFocus = false,
  size = 'lg',
  scanKey = 0
}) {
  const ref = React.useRef(null);
  const xl = size === 'lg';
  const m = MSG[state] || MSG.idle;
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(value);
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "vb-scan",
    style: {
      font: xl ? '600 15px/20px var(--font-sans)' : 'var(--type-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: scanKey,
    className: `vb-input vb-scan vb-scan--${state}`,
    style: {
      flex: 1,
      height: xl ? 'var(--control-scan)' : 'var(--control-lg)',
      borderWidth: 2,
      padding: '0 16px',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "scan-barcode",
    size: xl ? 28 : 20,
    style: {
      color: state === 'error' ? 'var(--red-600)' : 'var(--green-600)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    id: "vb-scan",
    ref: ref,
    value: value,
    autoFocus: autoFocus,
    autoComplete: "off",
    spellCheck: false,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    "aria-invalid": state === 'error' || undefined,
    "aria-describedby": message ? 'vb-scan-msg' : undefined,
    style: {
      font: xl ? 'var(--type-scan)' : 'var(--type-body)',
      letterSpacing: 'var(--tracking-code)',
      fontVariantNumeric: 'tabular-nums'
    }
  }), value && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-chip-remove",
    "aria-label": "Xo\xE1",
    onClick: () => {
      onChange && onChange('');
      ref.current && ref.current.focus();
    },
    style: {
      width: 32,
      height: 32
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), onCamera && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--secondary vb-btn--icon",
    "aria-label": "Qu\xE9t b\u1EB1ng camera",
    onClick: onCamera,
    style: {
      height: xl ? 'var(--control-scan)' : 'var(--control-lg)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "camera",
    size: xl ? 26 : 20
  }))), message && /*#__PURE__*/React.createElement("div", {
    id: "vb-scan-msg",
    role: state === 'error' ? 'alert' : 'status',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: xl ? '500 15px/22px var(--font-sans)' : 'var(--type-helper)',
      color: m.color
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m.icon,
    size: xl ? 18 : 14
  }), message));
}
Object.assign(__ds_scope, { ScanInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ScanInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/SelectField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SelectField({
  label,
  required = false,
  helper,
  error,
  size = 'md',
  options = [],
  placeholder,
  id,
  className = '',
  style,
  ...rest
}) {
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("div", {
    className: `vb-field ${className}`,
    style: style
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    className: "vb-field__label"
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "req",
    "aria-hidden": "true"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: `vb-input vb-input--${size}${error ? ' vb-input--error' : ''}`,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    required: required,
    "aria-invalid": !!error || undefined
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    style: {
      position: 'absolute',
      right: 10,
      pointerEvents: 'none',
      color: 'var(--text-secondary)'
    }
  })), (error || helper) && /*#__PURE__*/React.createElement("div", {
    className: `vb-field__help${error ? ' vb-field__help--error' : ''}`
  }, error || helper));
}
Object.assign(__ds_scope, { SelectField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SelectField.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function TextField({
  label,
  required = false,
  helper,
  error,
  size = 'md',
  icon,
  suffix,
  multiline = false,
  disabled = false,
  id,
  className = '',
  style,
  inputStyle,
  ...rest
}) {
  const fid = id || React.useId();
  const desc = error || helper ? fid + '-desc' : undefined;
  const Tag = multiline ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("div", {
    className: `vb-field ${className}`,
    style: style
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    className: "vb-field__label"
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "req",
    "aria-hidden": "true"
  }, "*")), /*#__PURE__*/React.createElement("div", {
    className: `vb-input vb-input--${size}${multiline ? ' vb-input--textarea' : ''}${error ? ' vb-input--error' : ''}${disabled ? ' vb-input--disabled' : ''}`
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === 'lg' || size === 'xl' ? 20 : 16,
    style: {
      color: 'var(--text-muted)'
    }
  }), /*#__PURE__*/React.createElement(Tag, _extends({
    id: fid,
    required: required,
    disabled: disabled,
    "aria-invalid": !!error || undefined,
    "aria-describedby": desc,
    style: inputStyle
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap'
    }
  }, suffix)), (error || helper) && /*#__PURE__*/React.createElement("div", {
    id: desc,
    className: `vb-field__help${error ? ' vb-field__help--error' : ''}`
  }, error && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-x",
    size: 14,
    style: {
      marginTop: 1
    }
  }), error || helper));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AppShell.jsx
try { (() => {
const ROLE_LABEL = {
  manager: 'Quản lý',
  staff: 'Nhân viên kho'
};

// navItems: [{ key, label, icon, count, section }]
// role 'manager' → desktop sidebar; role 'staff' → tablet/mobile header + bottom tab bar.
function AppShell({
  role = 'manager',
  navItems = [],
  activeKey,
  onNavigate,
  user = {},
  title,
  subtitle,
  actions,
  brand,
  children,
  onLogout,
  contentPadding
}) {
  const go = k => e => {
    e.preventDefault();
    onNavigate && onNavigate(k);
  };
  const brandNode = brand || /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 16px/20px var(--font-sans)',
      letterSpacing: '.16em',
      color: '#fff'
    }
  }, "VIBASIC");
  const initials = (user.name || '?').split(' ').slice(-1)[0][0];
  const avatar = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 32,
      height: 32,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--grey-100)',
      color: 'var(--grey-700)',
      font: '600 13px/1 var(--font-sans)',
      borderRadius: 'var(--radius-md)'
    }
  }, initials);
  if (role === 'staff') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--surface-page)'
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 64,
        padding: '0 16px',
        background: 'var(--surface-brand)',
        color: '#fff',
        flex: 'none'
      }
    }, brandNode, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 1,
        height: 24,
        background: 'rgba(255,255,255,.3)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 18px/24px var(--font-sans)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, title), subtitle && /*#__PURE__*/React.createElement("div", {
      style: {
        font: '400 13px/18px var(--font-sans)',
        color: 'var(--green-100)'
      }
    }, subtitle)), actions, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 14px/18px var(--font-sans)'
      }
    }, user.name), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '400 12px/16px var(--font-sans)',
        color: 'var(--green-100)'
      }
    }, ROLE_LABEL.staff)))), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: contentPadding ?? 16
      }
    }, children), /*#__PURE__*/React.createElement("nav", {
      "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh",
      style: {
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid var(--border-default)',
        flex: 'none'
      }
    }, navItems.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.key,
      type: "button",
      className: "vb-tab-item",
      "aria-current": n.key === activeKey ? 'page' : undefined,
      onClick: go(n.key)
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: n.icon,
      size: 24
    }), n.label, n.count ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 6,
        left: 'calc(50% + 8px)',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        background: 'var(--red-600)',
        color: '#fff',
        borderRadius: 'var(--radius-full)',
        font: '600 11px/18px var(--font-sans)'
      }
    }, n.count) : null))));
  }
  const sections = [];
  navItems.forEach(n => {
    const s = n.section || '';
    let g = sections.find(x => x[0] === s);
    if (!g) sections.push(g = [s, []]);
    g[1].push(n);
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'var(--sidebar-width) minmax(0,1fr)',
      height: '100%',
      minHeight: 0,
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRight: '1px solid var(--border-default)',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'var(--topbar-height)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      background: 'var(--surface-brand)',
      flex: 'none'
    }
  }, brandNode), /*#__PURE__*/React.createElement("nav", {
    "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh",
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, sections.map(([s, items]) => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, s && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--tracking-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      padding: '4px 10px'
    }
  }, s), items.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.key,
    href: '#' + n.key,
    className: "vb-nav-item",
    "aria-current": n.key === activeKey ? 'page' : undefined,
    onClick: go(n.key)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: n.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, n.label), n.count ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 20,
      height: 20,
      padding: '0 6px',
      display: 'grid',
      placeItems: 'center',
      background: n.countTone === 'danger' ? 'var(--red-600)' : 'var(--grey-100)',
      color: n.countTone === 'danger' ? '#fff' : 'var(--grey-700)',
      borderRadius: 'var(--radius-sm)',
      font: '600 11px/1 var(--font-sans)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, n.count) : null))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderTop: '1px solid var(--border-default)'
    }
  }, avatar, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 13px/18px var(--font-sans)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, ROLE_LABEL[role])), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "vb-btn vb-btn--ghost vb-btn--sm vb-btn--icon",
    "aria-label": "\u0110\u0103ng xu\u1EA5t",
    onClick: onLogout
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "log-out",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-height)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 24px',
      background: '#fff',
      borderBottom: '1px solid var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, subtitle), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-page-title)',
      fontSize: 18,
      lineHeight: '24px'
    }
  }, title)), actions), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: contentPadding ?? 24
    }
  }, children)));
}
Object.assign(__ds_scope, { AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AppShell.jsx", error: String((e && e.message) || e) }); }

// components/status/ApprovalStepper.jsx
try { (() => {
// Draft → Pending → Approved | Rejected. `history` carries who/when per step.
function ApprovalStepper({
  status = 'draft',
  history = {},
  size = 'md',
  orientation = 'horizontal'
}) {
  const order = ['draft', 'pending', 'final'];
  const idx = status === 'draft' ? 0 : status === 'pending' ? 1 : 2;
  const rejected = status === 'rejected';
  const steps = [{
    key: 'draft',
    label: 'Nháp',
    icon: 'square-pen'
  }, {
    key: 'pending',
    label: 'Chờ duyệt',
    icon: 'hourglass'
  }, rejected ? {
    key: 'rejected',
    label: 'Từ chối',
    icon: 'x'
  } : {
    key: 'approved',
    label: 'Đã duyệt',
    icon: 'check'
  }];
  const lg = size === 'lg';
  const node = lg ? 32 : 24;
  const vertical = orientation === 'vertical';
  return /*#__PURE__*/React.createElement("ol", {
    "aria-label": "Ti\u1EBFn tr\xECnh duy\u1EC7t",
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: vertical ? 0 : 0
    }
  }, steps.map((s, i) => {
    const done = i < idx || i === 2 && idx === 2;
    const current = i === idx && idx < 2;
    const bad = i === 2 && rejected;
    const bg = bad ? 'var(--red-600)' : done ? 'var(--green-500)' : current ? 'var(--amber-50)' : '#fff';
    const bd = bad ? 'var(--red-600)' : done ? 'var(--green-500)' : current ? 'var(--amber-500)' : 'var(--grey-300)';
    const fg = bad || done ? '#fff' : current ? 'var(--amber-700)' : 'var(--grey-400)';
    const h = history[s.key] || {};
    const last = i === steps.length - 1;
    return /*#__PURE__*/React.createElement("li", {
      key: s.key,
      "aria-current": current ? 'step' : undefined,
      style: {
        flex: last || vertical ? 'none' : 1,
        display: 'flex',
        flexDirection: vertical ? 'row' : 'column',
        gap: vertical ? 12 : 8,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: node,
        height: node,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: bg,
        border: `2px solid ${bd}`,
        color: fg,
        borderRadius: 'var(--radius-sm)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: done && !bad && i < 2 ? 'check' : s.icon,
      size: lg ? 16 : 13,
      strokeWidth: 2.5
    })), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        [vertical ? 'width' : 'height']: 2,
        [vertical ? 'minHeight' : 'minWidth']: 24,
        background: i < idx ? 'var(--green-500)' : 'var(--grey-200)',
        margin: vertical ? '4px 0' : '0 8px'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingRight: vertical ? 0 : 12,
        paddingBottom: vertical && !last ? 12 : 0,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: lg ? '600 15px/20px var(--font-sans)' : '600 13px/18px var(--font-sans)',
        color: bad ? 'var(--red-700)' : done || current ? 'var(--text-primary)' : 'var(--text-muted)'
      }
    }, s.label), (h.by || h.at) && /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-helper)',
        color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, [h.by, h.at].filter(Boolean).join(' · ')), h.note && /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-helper)',
        color: bad ? 'var(--red-700)' : 'var(--text-secondary)',
        marginTop: 2
      }
    }, "\u201C", h.note, "\u201D")));
  }));
}
Object.assign(__ds_scope, { ApprovalStepper });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/ApprovalStepper.jsx", error: String((e && e.message) || e) }); }

// components/status/PriorityChip.jsx
try { (() => {
const META = {
  urgent: {
    label: 'Khẩn cấp',
    icon: 'triangle-alert'
  },
  order: {
    label: 'Cần đặt',
    icon: 'shopping-cart'
  },
  watch: {
    label: 'Theo dõi',
    icon: 'eye'
  }
};
function PriorityChip({
  priority = 'watch',
  label,
  size = 'md'
}) {
  const m = META[priority] || META.watch;
  const lg = size === 'lg';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: lg ? 28 : 22,
      padding: lg ? '0 10px 0 11px' : '0 8px 0 9px',
      font: lg ? '600 14px/20px var(--font-sans)' : '600 12px/16px var(--font-sans)',
      whiteSpace: 'nowrap',
      color: `var(--priority-${priority}-fg)`,
      background: `var(--priority-${priority}-bg)`,
      border: `1px solid var(--priority-${priority}-border)`,
      clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m.icon,
    size: lg ? 16 : 13,
    strokeWidth: 2.25
  }), label || m.label);
}
Object.assign(__ds_scope, { PriorityChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/PriorityChip.jsx", error: String((e && e.message) || e) }); }

// components/status/StatusBadge.jsx
try { (() => {
const STATUS_META = {
  draft: {
    label: 'Nháp',
    icon: 'square-pen'
  },
  pending: {
    label: 'Chờ duyệt',
    icon: 'hourglass'
  },
  approved: {
    label: 'Đã duyệt',
    icon: 'circle-check'
  },
  rejected: {
    label: 'Từ chối',
    icon: 'circle-x'
  },
  hold: {
    label: 'Tạm hoãn',
    icon: 'circle-pause'
  },
  locked: {
    label: 'Lô đã khoá',
    icon: 'lock'
  },
  info: {
    label: 'Đang xử lý',
    icon: 'refresh-cw'
  }
};
function StatusBadge({
  status = 'draft',
  label,
  size = 'md',
  icon
}) {
  const m = STATUS_META[status] || STATUS_META.draft;
  const lg = size === 'lg';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: lg ? 6 : 5,
      height: lg ? 28 : 22,
      padding: lg ? '0 10px' : '0 7px',
      borderRadius: 'var(--radius-badge)',
      font: lg ? '600 14px/20px var(--font-sans)' : '600 12px/16px var(--font-sans)',
      whiteSpace: 'nowrap',
      color: `var(--status-${status}-fg)`,
      background: `var(--status-${status}-bg)`,
      border: `1px solid var(--status-${status}-border)`
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || m.icon,
    size: lg ? 16 : 13,
    strokeWidth: 2.25
  }), label || m.label);
}
Object.assign(__ds_scope, { STATUS_META, StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/status/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/LotCard.jsx
try { (() => {
const STATE = {
  next: {
    label: 'Lấy tiếp theo',
    border: 'var(--green-500)',
    bw: 2
  },
  picking: {
    label: 'Đang lấy',
    border: 'var(--green-500)',
    bw: 2
  },
  waiting: {
    label: 'Chờ',
    border: 'var(--border-default)',
    bw: 1
  },
  done: {
    label: 'Đã đủ',
    border: 'var(--green-200)',
    bw: 1
  },
  locked: {
    label: 'Lô đã khoá',
    border: 'var(--slate-900)',
    bw: 1
  }
};

// One lot in a FIFO pick list. fifoOrder 1 = oldest = pick first.
function LotCard({
  fifoOrder,
  lotCode,
  productName,
  receivedAt,
  ageDays,
  location,
  available,
  toPick,
  picked = 0,
  unit = 'cái',
  state = 'waiting',
  size = 'md',
  onClick
}) {
  const s = STATE[state] || STATE.waiting;
  const lg = size === 'lg';
  const pct = toPick ? Math.min(100, Math.round(picked / toPick * 100)) : 0;
  const locked = state === 'locked';
  const Tag = onClick ? 'button' : 'div';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    onClick: onClick,
    className: onClick ? 'vb-clickable' : undefined,
    "aria-current": state === 'picking' || state === 'next' ? 'true' : undefined,
    style: {
      all: onClick ? 'unset' : undefined,
      boxSizing: 'border-box',
      display: 'flex',
      gap: lg ? 16 : 12,
      padding: lg ? 16 : 12,
      background: locked ? 'var(--grey-50)' : state === 'done' ? 'var(--green-50)' : '#fff',
      border: `${s.bw}px solid ${s.border}`,
      borderRadius: 'var(--radius-lg)',
      width: '100%',
      textAlign: 'left',
      cursor: onClick ? 'pointer' : undefined,
      opacity: locked ? .85 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      width: lg ? 52 : 40,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 10px/12px var(--font-sans)',
      letterSpacing: 'var(--tracking-overline)',
      color: 'var(--text-muted)'
    }
  }, "FIFO"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: lg ? 44 : 34,
      height: lg ? 44 : 34,
      display: 'grid',
      placeItems: 'center',
      background: state === 'done' ? 'var(--green-500)' : fifoOrder === 1 && !locked ? 'var(--grey-900)' : '#fff',
      color: state === 'done' || fifoOrder === 1 && !locked ? '#fff' : 'var(--grey-800)',
      border: '1.5px solid ' + (state === 'done' ? 'var(--green-500)' : 'var(--grey-900)'),
      font: lg ? '600 20px/24px var(--font-sans)' : '600 16px/20px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums',
      clipPath: 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))'
    }
  }, state === 'done' ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: lg ? 22 : 18,
    strokeWidth: 2.5
  }) : fifoOrder)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: lg ? 6 : 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vb-code",
    style: {
      font: lg ? '600 17px/24px var(--font-sans)' : '600 14px/20px var(--font-sans)',
      letterSpacing: 'var(--tracking-code)'
    }
  }, lotCode), locked ? /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: "locked"
  }) : state === 'picking' || state === 'next' ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/16px var(--font-sans)',
      color: 'var(--green-700)'
    }
  }, "\u25CF ", s.label) : null), productName && /*#__PURE__*/React.createElement("div", {
    style: {
      font: lg ? 'var(--type-touch-body)' : 'var(--type-body)',
      color: 'var(--text-primary)'
    }
  }, productName), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: lg ? 16 : 12,
      flexWrap: 'wrap',
      font: lg ? '400 14px/20px var(--font-sans)' : 'var(--type-helper)',
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, receivedAt && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 14
  }), "Nh\u1EADp ", receivedAt, ageDays != null && ` · ${ageDays} ngày`), location && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "warehouse",
    size: 14
  }), location), available != null && /*#__PURE__*/React.createElement("span", null, "T\u1ED3n l\xF4: ", available, " ", unit)), toPick != null && !locked && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: lg ? 8 : 6,
      background: 'var(--grey-100)',
      borderRadius: 1,
      overflow: 'hidden'
    },
    role: "progressbar",
    "aria-valuenow": picked,
    "aria-valuemax": toPick,
    "aria-label": "\u0110\xE3 qu\xE9t"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + '%',
      height: '100%',
      background: 'var(--green-500)',
      transition: 'width var(--duration-base) var(--ease-standard)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: lg ? '600 16px/20px var(--font-sans)' : '600 13px/18px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, picked, "/", toPick, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-secondary)'
    }
  }, unit)))));
}
Object.assign(__ds_scope, { LotCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LotCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/manager/dashboard.jsx
try { (() => {
const {
  KpiTile,
  DataTable,
  StatusBadge,
  PriorityChip,
  Button,
  IconButton,
  Icon,
  AlertBanner
} = window.VB;
function Panel({
  title,
  meta,
  action,
  children,
  pad = true
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-section-title)'
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, meta), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8
    }
  }, action)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad ? 16 : 0,
      flex: 1,
      minHeight: 0
    }
  }, children));
}
const ALERT_TONE = {
  danger: ['var(--red-50)', 'var(--red-600)'],
  warning: ['var(--amber-50)', 'var(--amber-700)'],
  locked: ['var(--slate-900)', '#fff']
};
function MovementChart({
  data
}) {
  const max = Math.max(...data.flatMap(d => [d.in, d.out]));
  const tIn = data.reduce((s, d) => s + d.in, 0),
    tOut = data.reduce((s, d) => s + d.out, 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24
    }
  }, [['Nhập', tIn, 'var(--green-500)'], ['Xuất', tOut, 'var(--grey-700)']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      background: c
    }
  }), l, " 7 ng\xE0y"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 20px/28px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmt(v), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, "\u0111\u01A1n v\u1ECB"))))), /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": `Nhập ${tIn}, xuất ${tOut} trong 7 ngày`,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length},1fr)`,
      gap: 10,
      height: 132,
      alignItems: 'end',
      borderBottom: '1px solid var(--border-default)'
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    title: `${d.date}: nhập ${d.in}, xuất ${d.out}`,
    style: {
      display: 'flex',
      gap: 3,
      alignItems: 'end',
      height: '100%',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: `${d.in / max * 100}%`,
      minHeight: d.in ? 2 : 0,
      background: 'var(--green-500)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: `${d.out / max * 100}%`,
      background: 'var(--grey-700)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length},1fr)`,
      gap: 10,
      marginTop: -6
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      textAlign: 'center',
      font: 'var(--type-helper)',
      color: i === data.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: i === data.length - 1 ? 600 : 400,
      fontVariantNumeric: 'tabular-nums'
    }
  }, d.date))));
}
function Dashboard({
  pending,
  onApprove,
  onReject,
  onNavigate
}) {
  const below = RESTOCK.filter(r => r.p !== 'watch').sort((a, b) => a.stock / a.d - b.stock / b.d);
  const urgent = below.filter(r => r.p === 'urgent').length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 1440
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(KpiTile, {
    icon: "triangle-alert",
    tone: "danger",
    label: "D\u01B0\u1EDBi \u0111i\u1EC3m \u0111\u1EB7t h\xE0ng",
    value: below.length,
    unit: "m\u1EB7t h\xE0ng",
    footnote: `${urgent} khẩn cấp · tính lại 06:00 hôm nay`,
    onClick: () => onNavigate('restock')
  }), /*#__PURE__*/React.createElement(KpiTile, {
    icon: "hourglass",
    tone: "warning",
    label: "Phi\u1EBFu ch\u1EDD duy\u1EC7t",
    value: pending.length,
    unit: "phi\u1EBFu",
    footnote: "C\u0169 nh\u1EA5t: 19 gi\u1EDD tr\u01B0\u1EDBc",
    onClick: () => onNavigate('approvals')
  }), /*#__PURE__*/React.createElement(KpiTile, {
    icon: "bell",
    tone: "info",
    label: "C\u1EA3nh b\xE1o \u0111ang m\u1EDF",
    value: ALERTS.length,
    footnote: "2 t\u1ED3n kho \xB7 1 l\xF4 \xB7 2 v\u1EADn h\xE0nh",
    onClick: () => onNavigate('alerts')
  }), /*#__PURE__*/React.createElement(KpiTile, {
    icon: "package-minus",
    label: "Xu\u1EA5t kho 7 ng\xE0y",
    value: fmt(1722),
    unit: "\u0111\u01A1n v\u1ECB",
    delta: {
      value: '8,4%',
      direction: 'up',
      good: true
    },
    footnote: "So v\u1EDBi 7 ng\xE0y tr\u01B0\u1EDBc"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,2fr) minmax(320px,1fr)',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Phi\u1EBFu ch\u1EDD duy\u1EC7t",
    meta: `${pending.length} phiếu`,
    pad: false,
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      iconRight: "arrow-right",
      onClick: () => onNavigate('approvals')
    }, "T\u1EA5t c\u1EA3")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: -1
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    rowKey: "id",
    maxHeight: 340,
    columns: [{
      key: 'id',
      header: 'Mã phiếu',
      width: 128,
      render: r => /*#__PURE__*/React.createElement("span", {
        className: "vb-code",
        style: {
          fontWeight: 600
        }
      }, r.id)
    }, {
      key: 'type',
      header: 'Loại',
      width: 120,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: r.icon,
        size: 15,
        style: {
          color: 'var(--text-secondary)'
        }
      }), r.type)
    }, {
      key: 'note',
      header: 'Nội dung',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", null, r.note), /*#__PURE__*/React.createElement("div", {
        style: {
          font: 'var(--type-helper)',
          color: 'var(--text-secondary)'
        }
      }, r.by, " \xB7 ", r.at))
    }, {
      key: 'qty',
      header: 'SL',
      numeric: true,
      width: 64,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          color: r.qty < 0 ? 'var(--red-700)' : undefined,
          fontWeight: 600
        }
      }, r.qty > 0 ? fmt(r.qty) : '−' + fmt(-r.qty))
    }, {
      key: 'act',
      header: '',
      width: 172,
      align: 'right',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6,
          justifyContent: 'flex-end'
        }
      }, /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "danger-outline",
        onClick: () => onReject(r)
      }, "T\u1EEB ch\u1ED1i"), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        icon: "check",
        onClick: () => onApprove(r)
      }, "Duy\u1EC7t"))
    }],
    rows: pending,
    empty: /*#__PURE__*/React.createElement(window.VB.EmptyState, {
      icon: "clipboard-check",
      title: "Kh\xF4ng c\xF2n phi\u1EBFu ch\u1EDD duy\u1EC7t",
      description: "Phi\u1EBFu m\u1EDBi t\u1EEB nh\xE2n vi\xEAn kho s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y."
    })
  }))), /*#__PURE__*/React.createElement(Panel, {
    title: "C\u1EA3nh b\xE1o \u0111ang m\u1EDF",
    meta: `${ALERTS.length}`,
    pad: false
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, ALERTS.map((a, i) => {
    const [bg, fg] = ALERT_TONE[a.tone];
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        padding: '11px 16px',
        borderTop: i ? '1px solid var(--border-subtle)' : 0,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 28,
        height: 28,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: bg,
        color: fg,
        borderRadius: 'var(--radius-sm)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: a.icon,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 13px/18px var(--font-sans)'
      }
    }, a.title), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--type-helper)',
        color: 'var(--text-secondary)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, a.meta)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-helper)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap'
      }
    }, a.time));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,2fr) minmax(320px,1fr)',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "M\u1EB7t h\xE0ng d\u01B0\u1EDBi \u0111i\u1EC3m \u0111\u1EB7t h\xE0ng",
    meta: "S\u1EAFp x\u1EBFp theo s\u1ED1 ng\xE0y t\u1ED3n c\xF2n l\u1EA1i",
    pad: false,
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      icon: "shopping-cart",
      onClick: () => onNavigate('restock')
    }, "Xem \u0111\u1EC1 xu\u1EA5t nh\u1EADp h\xE0ng")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: -1
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    rowKey: "id",
    onRowClick: () => onNavigate('restock'),
    columns: [{
      key: 'id',
      header: 'Mã SP',
      width: 84,
      render: r => /*#__PURE__*/React.createElement("span", {
        className: "vb-code"
      }, r.id)
    }, {
      key: 'name',
      header: 'Sản phẩm',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 500
        }
      }, r.name)
    }, {
      key: 'sup',
      header: 'Nhà cung cấp',
      render: r => SUPPLIERS[r.sup].name
    }, {
      key: 'stock',
      header: 'Tồn',
      numeric: true,
      render: r => fmt(r.stock)
    }, {
      key: 'rop',
      header: 'ROP',
      numeric: true,
      render: r => fmt(r.rop)
    }, {
      key: 'days',
      header: 'Còn (ngày)',
      numeric: true,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600,
          color: r.stock / r.d < SUPPLIERS[r.sup].lead ? 'var(--red-700)' : undefined
        }
      }, fmt(r.stock / r.d, 1))
    }, {
      key: 'p',
      header: 'Ưu tiên',
      width: 112,
      render: r => /*#__PURE__*/React.createElement(PriorityChip, {
        priority: r.p
      })
    }],
    rows: below
  }))), /*#__PURE__*/React.createElement(Panel, {
    title: "Lu\xE2n chuy\u1EC3n kho",
    meta: "27/10 \u2013 03/11"
  }, /*#__PURE__*/React.createElement(MovementChart, {
    data: MOVEMENT
  }))));
}
Object.assign(window, {
  Dashboard,
  Panel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/manager/dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/manager/data.js
try { (() => {
// Vibasic sample data — manager desktop kit
window.VB = window.VibasicDesignSystem_90e71f;
window.fmt = (n, d = 0) => n == null ? '—' : Number(n).toLocaleString('vi-VN', {
  minimumFractionDigits: d,
  maximumFractionDigits: d
});
window.MGR_NAV = [{
  key: 'dashboard',
  label: 'Tổng quan',
  icon: 'layout-dashboard',
  section: 'Theo dõi'
}, {
  key: 'alerts',
  label: 'Cảnh báo',
  icon: 'bell',
  count: 5,
  countTone: 'danger',
  section: 'Theo dõi'
}, {
  key: 'restock',
  label: 'Đề xuất nhập hàng',
  icon: 'shopping-cart',
  count: 9,
  section: 'Theo dõi'
}, {
  key: 'approvals',
  label: 'Chờ duyệt',
  icon: 'clipboard-check',
  count: 6,
  section: 'Nghiệp vụ'
}, {
  key: 'receipts',
  label: 'Nhập kho',
  icon: 'package-plus',
  section: 'Nghiệp vụ'
}, {
  key: 'issues',
  label: 'Xuất kho',
  icon: 'package-minus',
  section: 'Nghiệp vụ'
}, {
  key: 'lots',
  label: 'Tra cứu lô',
  icon: 'layers',
  section: 'Nghiệp vụ'
}, {
  key: 'stocktake',
  label: 'Kiểm kê',
  icon: 'list-checks',
  section: 'Nghiệp vụ'
}, {
  key: 'abnormal',
  label: 'Báo cáo bất thường',
  icon: 'shield-alert',
  section: 'Nghiệp vụ'
}, {
  key: 'reports',
  label: 'Báo cáo',
  icon: 'chart-column',
  section: 'Phân tích'
}, {
  key: 'products',
  label: 'Sản phẩm',
  icon: 'boxes',
  section: 'Danh mục'
}, {
  key: 'suppliers',
  label: 'Nhà cung cấp',
  icon: 'factory',
  section: 'Danh mục'
}, {
  key: 'staff',
  label: 'Tài khoản',
  icon: 'users',
  section: 'Danh mục'
}];
window.PENDING = [{
  id: 'PX-2611-0042',
  type: 'Xuất kho',
  icon: 'package-minus',
  by: 'Lê Văn Tâm',
  at: '03/11 09:14',
  lines: 3,
  qty: 34,
  note: 'Đơn DH-2611-0107 · Nhà hàng Mộc Gia'
}, {
  id: 'PN-2611-0018',
  type: 'Nhập kho',
  icon: 'package-plus',
  by: 'Phạm Thị Lan',
  at: '03/11 08:47',
  lines: 2,
  qty: 360,
  note: 'Ván ép Phú Thịnh · QC đạt 358/360'
}, {
  id: 'BC-2611-0004',
  type: 'Bất thường',
  icon: 'shield-alert',
  by: 'Lê Văn Tâm',
  at: '03/11 08:05',
  lines: 1,
  qty: 3,
  note: 'Nứt chân ghế · LOT-2608-031'
}, {
  id: 'KK-2610-0009',
  type: 'Kiểm kê',
  icon: 'list-checks',
  by: 'Trần Quốc Bảo',
  at: '02/11 17:30',
  lines: 42,
  qty: -4,
  note: 'Khu B · lệch 4 cái'
}, {
  id: 'PX-2611-0041',
  type: 'Xuất kho',
  icon: 'package-minus',
  by: 'Phạm Thị Lan',
  at: '02/11 16:02',
  lines: 1,
  qty: 12,
  note: 'Đơn DH-2611-0104 · Showroom Quận 7'
}, {
  id: 'PN-2611-0017',
  type: 'Nhập kho',
  icon: 'package-plus',
  by: 'Trần Quốc Bảo',
  at: '02/11 14:21',
  lines: 4,
  qty: 1600,
  note: 'Phụ kiện Tân Á'
}];
window.ALERTS = [{
  tone: 'danger',
  icon: 'triangle-alert',
  title: 'Bản lề giảm chấn 35mm còn 4,7 ngày',
  meta: 'Dưới ROP 395 · NCC giao 5 ngày',
  time: '06:00'
}, {
  tone: 'danger',
  icon: 'triangle-alert',
  title: 'Ghế ăn gỗ sồi GS-02 còn 3,5 ngày',
  meta: 'Tồn 14 · ROP 52',
  time: '06:00'
}, {
  tone: 'locked',
  icon: 'lock',
  title: 'Lô LOT-2608-031 chờ khoá',
  meta: 'Báo cáo bất thường BC-2611-0004',
  time: '08:05'
}, {
  tone: 'warning',
  icon: 'list-checks',
  title: 'Kiểm kê khu B lệch −4 cái',
  meta: 'KK-2610-0009 · cần lý do',
  time: 'Hôm qua'
}, {
  tone: 'warning',
  icon: 'clock',
  title: 'PO-2610-022 trễ 2 ngày',
  meta: 'Ván ép Phú Thịnh · 100 tấm',
  time: 'Hôm qua'
}];
window.MOVEMENT = [{
  d: 'T3',
  date: '27/10',
  in: 420,
  out: 310
}, {
  d: 'T4',
  date: '28/10',
  in: 0,
  out: 265
}, {
  d: 'T5',
  date: '29/10',
  in: 180,
  out: 298
}, {
  d: 'T6',
  date: '30/10',
  in: 640,
  out: 344
}, {
  d: 'T7',
  date: '31/10',
  in: 0,
  out: 122
}, {
  d: 'T2',
  date: '02/11',
  in: 360,
  out: 287
}, {
  d: 'T3',
  date: '03/11',
  in: 0,
  out: 96
}];
window.SUPPLIERS = {
  ml: {
    name: 'Gỗ Minh Long',
    lead: 10,
    contact: 'Anh Khoa · 0903 118 245',
    cat: 'Nội thất gỗ'
  },
  pt: {
    name: 'Ván ép Phú Thịnh',
    lead: 7,
    contact: 'Chị Ngọc · 0918 402 771',
    cat: 'Ván & tấm'
  },
  ta: {
    name: 'Phụ kiện Tân Á',
    lead: 5,
    contact: 'Anh Huy · 0937 650 112',
    cat: 'Phụ kiện'
  }
};

// d = nhu cầu TB/ngày (12 tuần), ss = tồn an toàn
window.RESTOCK = [{
  id: 'GS-02',
  sup: 'ml',
  name: 'Ghế ăn gỗ sồi',
  unit: 'cái',
  stock: 14,
  inc: 0,
  d: 4,
  rop: 52,
  eoq: 120,
  p: 'urgent',
  qty: 160,
  reason: 'Tăng từ EOQ 120 → 160: tồn hết trước khi hàng về (3,5 < 10 ngày giao).'
}, {
  id: 'TD-08',
  sup: 'ml',
  name: 'Tủ đầu giường gỗ sồi',
  unit: 'cái',
  stock: 3,
  inc: 0,
  d: 0.6,
  rop: 9,
  eoq: 15,
  p: 'urgent',
  qty: 18,
  reason: 'Làm tròn EOQ 15 → 18 theo kiện 6 cái.'
}, {
  id: 'BA-12',
  sup: 'ml',
  name: 'Bàn ăn gỗ óc chó 1m6',
  unit: 'cái',
  stock: 9,
  inc: 4,
  d: 0.8,
  rop: 12,
  eoq: 20,
  p: 'order',
  qty: 20,
  reason: 'Theo EOQ.'
}, {
  id: 'GT-05',
  sup: 'ml',
  name: 'Ghế thư giãn gỗ tần bì',
  unit: 'cái',
  stock: 22,
  inc: 0,
  d: 1.2,
  rop: 16,
  eoq: 30,
  p: 'watch',
  qty: 0,
  reason: 'Trên ROP — chưa cần đặt.'
}, {
  id: 'VE-18',
  sup: 'pt',
  name: 'Ván ép phủ melamine 18mm',
  unit: 'tấm',
  stock: 85,
  inc: 0,
  d: 14,
  rop: 138,
  eoq: 300,
  p: 'urgent',
  qty: 350,
  reason: 'Làm tròn EOQ 300 → 350 theo pallet 50 tấm; bù 6 ngày thiếu.'
}, {
  id: 'MDF-17',
  sup: 'pt',
  name: 'Ván MDF chống ẩm 17mm',
  unit: 'tấm',
  stock: 64,
  inc: 0,
  d: 6,
  rop: 60,
  eoq: 150,
  p: 'order',
  qty: 150,
  reason: 'Theo EOQ.'
}, {
  id: 'VE-12',
  sup: 'pt',
  name: 'Ván ép phủ melamine 12mm',
  unit: 'tấm',
  stock: 72,
  inc: 100,
  d: 9,
  rop: 88,
  eoq: 200,
  p: 'watch',
  qty: 0,
  reason: 'Đã có 100 tấm đang về (PO-2610-022).'
}, {
  id: 'BL-35',
  sup: 'ta',
  name: 'Bản lề giảm chấn 35mm',
  unit: 'cái',
  stock: 260,
  inc: 0,
  d: 55,
  rop: 395,
  eoq: 1200,
  p: 'urgent',
  qty: 1400,
  reason: 'Nhu cầu 4 tuần gần nhất tăng 18% — cộng thêm 200 vào EOQ.'
}, {
  id: 'RT-45',
  sup: 'ta',
  name: 'Ray trượt bi 45cm',
  unit: 'bộ',
  stock: 180,
  inc: 0,
  d: 20,
  rop: 150,
  eoq: 500,
  p: 'watch',
  qty: 0,
  reason: 'Còn 9 ngày, gần ROP — theo dõi.'
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/manager/data.js", error: String((e && e.message) || e) }); }

// ui_kits/manager/manager-app.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const A = window.VB;
const TITLES = {
  dashboard: ['Tổng quan kho', 'Thứ Ba, 03/11/2026 · Kho Bình Dương'],
  restock: ['Đề xuất nhập hàng', 'Tính lại lúc 06:00 · 02/11/2026 (hằng tuần, thứ Hai)']
};
function ManagerApp() {
  const [page, setPage] = React.useState(() => localStorage.getItem('vb-mgr-page') || 'dashboard');
  const [pending, setPending] = React.useState(PENDING);
  const [dlg, setDlg] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    localStorage.setItem('vb-mgr-page', page);
  }, [page]);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const resolve = (r, ok, reason) => {
    const prev = pending;
    setPending(p => p.filter(x => x.id !== r.id));
    setDlg(null);
    setToast({
      tone: ok ? 'success' : 'danger',
      title: `${ok ? 'Đã duyệt' : 'Đã từ chối'} phiếu ${r.id}`,
      message: ok ? `Thông báo đã gửi đến ${r.by}.` : `Lý do: ${reason}`,
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          setPending(prev);
          setToast(null);
        }
      }
    });
  };
  const [title, sub] = TITLES[page] || [MGR_NAV.find(n => n.key === page)?.label, ''];
  const actions = page === 'restock' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(A.Button, {
    variant: "secondary",
    icon: "refresh-cw"
  }, "T\xEDnh l\u1EA1i"), /*#__PURE__*/React.createElement(A.Button, {
    variant: "secondary",
    icon: "download"
  }, "Xu\u1EA5t Excel")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(A.IconButton, {
    icon: "bell",
    label: "C\u1EA3nh b\xE1o",
    badge: ALERTS.length,
    variant: "secondary",
    onClick: () => setPage('alerts')
  }), /*#__PURE__*/React.createElement(A.Button, {
    variant: "secondary",
    icon: "download"
  }, "Xu\u1EA5t b\xE1o c\xE1o"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement(A.AppShell, {
    role: "manager",
    navItems: MGR_NAV.map(n => n.key === 'approvals' ? {
      ...n,
      count: pending.length
    } : n),
    activeKey: page,
    onNavigate: setPage,
    user: {
      name: 'Nguyễn Thu Hà'
    },
    title: title,
    subtitle: sub,
    actions: actions,
    brand: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/mark-white.png",
      alt: "",
      style: {
        height: 22
      }
    }), /*#__PURE__*/React.createElement("img", {
      src: "../../assets/wordmark-white.png",
      alt: "Vibasic",
      style: {
        height: 13
      }
    }))
  }, page === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    pending: pending,
    onNavigate: setPage,
    onApprove: r => setDlg({
      r,
      ok: true
    }),
    onReject: r => setDlg({
      r,
      ok: false
    })
  }), page === 'restock' && /*#__PURE__*/React.createElement(RestockProposal, {
    toast: setToast
  }), !['dashboard', 'restock'].includes(page) && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement(A.EmptyState, {
    icon: "square-pen",
    title: "M\xE0n h\xECnh ch\u01B0a c\xF3 trong b\u1EA3n th\u1EED",
    description: "B\u1EA3n UI th\u1EED g\u1ED3m T\u1ED5ng quan v\xE0 \u0110\u1EC1 xu\u1EA5t nh\u1EADp h\xE0ng. C\xE1c m\xE0n h\xECnh c\xF2n l\u1EA1i d\xF9ng c\xF9ng b\u1ED9 th\xE0nh ph\u1EA7n.",
    action: /*#__PURE__*/React.createElement(A.Button, {
      variant: "secondary",
      onClick: () => setPage('dashboard')
    }, "V\u1EC1 T\u1ED5ng quan")
  }))), dlg && /*#__PURE__*/React.createElement(A.ConfirmDialog, {
    key: dlg.r.id + dlg.ok,
    tone: dlg.ok ? 'primary' : 'danger',
    title: `${dlg.ok ? 'Duyệt' : 'Từ chối'} phiếu ${dlg.r.id}?`,
    description: dlg.ok ? `${dlg.r.type} · ${dlg.r.note}. Tồn kho sẽ được cập nhật ngay sau khi duyệt.` : `Phiếu sẽ trả về cho ${dlg.r.by} để chỉnh sửa.`,
    requireReason: !dlg.ok,
    confirmLabel: dlg.ok ? 'Duyệt phiếu' : 'Từ chối phiếu',
    onCancel: () => setDlg(null),
    onConfirm: reason => resolve(dlg.r, dlg.ok, reason)
  }), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      right: 24,
      bottom: 24,
      zIndex: 60
    }
  }, /*#__PURE__*/React.createElement(A.Toast, _extends({}, toast, {
    onClose: () => setToast(null)
  }))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(ManagerApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/manager/manager-app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/manager/restock.jsx
try { (() => {
const R = window.VB;
function DaysCell({
  r
}) {
  const days = r.stock / r.d,
    lead = SUPPLIERS[r.sup].lead;
  const pct = Math.min(100, days / (lead * 2) * 100);
  const short = days < lead;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    title: `Thời gian giao: ${lead} ngày`,
    style: {
      position: 'relative',
      width: 56,
      height: 6,
      background: 'var(--grey-100)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + '%',
      height: '100%',
      background: short ? 'var(--red-600)' : 'var(--grey-500)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: -3,
      bottom: -3,
      width: 1.5,
      background: 'var(--grey-900)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      textAlign: 'right',
      fontWeight: 600,
      color: short ? 'var(--red-700)' : undefined
    }
  }, fmt(days, 1)));
}
function QtyInput({
  value,
  onChange,
  unit,
  changed
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "vb-input vb-input--sm",
    style: {
      width: 104,
      marginLeft: 'auto',
      background: changed ? 'var(--amber-50)' : '#fff',
      borderColor: changed ? 'var(--amber-500)' : undefined,
      padding: '0 8px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: value === 0 ? '' : fmt(value),
    placeholder: "\u2014",
    inputMode: "numeric",
    "aria-label": "S\u1ED1 l\u01B0\u1EE3ng \u0111\u1EC1 xu\u1EA5t",
    onChange: e => {
      const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
      onChange(isNaN(n) ? 0 : n);
    },
    style: {
      textAlign: 'right',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      font: '600 13px/18px var(--font-sans)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, unit));
}
function RestockProposal({
  toast
}) {
  const [rows, setRows] = React.useState(RESTOCK.map(r => ({
    ...r,
    orig: r.qty
  })));
  const [q, setQ] = React.useState('');
  const [prio, setPrio] = React.useState('');
  const [sup, setSup] = React.useState('');
  const [sel, setSel] = React.useState(RESTOCK.filter(r => r.p === 'urgent').map(r => r.id));
  const [ordered, setOrdered] = React.useState([]);
  const counts = {
    urgent: 0,
    order: 0,
    watch: 0
  };
  rows.forEach(r => counts[r.p]++);
  const vis = rows.filter(r => (!prio || r.p === prio) && (!sup || r.sup === sup) && (!q || (r.id + r.name).toLowerCase().includes(q.toLowerCase())));
  const setQty = (id, v) => setRows(rs => rs.map(r => r.id === id ? {
    ...r,
    qty: v
  } : r));
  const order = ids => {
    const items = rows.filter(r => ids.includes(r.id) && r.qty > 0);
    const sups = [...new Set(items.map(r => r.sup))];
    setOrdered(o => [...o, ...items.map(r => r.id)]);
    setSel([]);
    toast({
      tone: 'success',
      title: `Đã tạo ${sups.length} đơn đặt hàng nháp`,
      message: `${items.length} mặt hàng · ${sups.map(s => SUPPLIERS[s].name).join(', ')}`
    });
  };
  const chips = [];
  if (prio) chips.push({
    key: 'prio',
    label: 'Ưu tiên: ' + {
      urgent: 'Khẩn cấp',
      order: 'Cần đặt',
      watch: 'Theo dõi'
    }[prio]
  });
  if (sup) chips.push({
    key: 'sup',
    label: 'NCC: ' + SUPPLIERS[sup].name
  });
  const PrioTab = ({
    k,
    label
  }) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPrio(prio === k ? '' : k),
    "aria-pressed": prio === k,
    className: "vb-clickable",
    style: {
      all: 'unset',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      background: '#fff',
      border: prio === k ? '2px solid var(--grey-900)' : '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement(R.PriorityChip, {
    priority: k
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 20px/28px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, counts[k]), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, label));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxWidth: 1440
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(PrioTab, {
    k: "urgent",
    label: "h\u1EBFt tr\u01B0\u1EDBc khi h\xE0ng v\u1EC1"
  }), /*#__PURE__*/React.createElement(PrioTab, {
    k: "order",
    label: "d\u01B0\u1EDBi ROP"
  }), /*#__PURE__*/React.createElement(PrioTab, {
    k: "watch",
    label: "g\u1EA7n ROP"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      alignSelf: 'center',
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)',
      maxWidth: 420,
      textAlign: 'right',
      textWrap: 'pretty'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, "ROP"), " = nhu c\u1EA7u TB/ng\xE0y \xD7 th\u1EDDi gian giao + t\u1ED3n an to\xE0n \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, "EOQ"), " = \u221A(2 \xD7 nhu c\u1EA7u n\u0103m \xD7 ph\xED \u0111\u1EB7t h\xE0ng \xF7 ph\xED l\u01B0u kho). D\u1EEF li\u1EC7u 12 tu\u1EA7n.")), /*#__PURE__*/React.createElement(R.FilterBar, {
    search: q,
    onSearchChange: setQ,
    searchPlaceholder: "T\xECm m\xE3 ho\u1EB7c t\xEAn s\u1EA3n ph\u1EA9m\u2026",
    filters: [{
      key: 'sup',
      label: 'Nhà cung cấp',
      value: sup,
      options: Object.entries(SUPPLIERS).map(([k, s]) => ({
        value: k,
        label: s.name
      }))
    }, {
      key: 'prio',
      label: 'Ưu tiên',
      value: prio,
      options: [{
        value: 'urgent',
        label: 'Khẩn cấp'
      }, {
        value: 'order',
        label: 'Cần đặt'
      }, {
        value: 'watch',
        label: 'Theo dõi'
      }]
    }],
    onFilterChange: (k, v) => k === 'sup' ? setSup(v) : setPrio(v),
    chips: chips,
    onRemoveChip: k => k === 'sup' ? setSup('') : setPrio(''),
    onClearAll: () => {
      setSup('');
      setPrio('');
    },
    resultCount: vis.length
  }), /*#__PURE__*/React.createElement(R.DataTable, {
    rowKey: "id",
    selectable: true,
    selected: sel,
    onSelectedChange: setSel,
    maxHeight: "calc(100vh - 330px)",
    bulkActions: /*#__PURE__*/React.createElement(R.Button, {
      size: "sm",
      icon: "send",
      onClick: () => order(sel)
    }, "T\u1EA1o \u0111\u01A1n \u0111\u1EB7t h\xE0ng (", sel.length, ")"),
    groupBy: "sup",
    groupHeader: (g, rs) => {
      const s = SUPPLIERS[g];
      const n = rs.filter(r => r.qty > 0 && !ordered.includes(r.id)).length;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }
      }, /*#__PURE__*/React.createElement(R.Icon, {
        name: "factory",
        size: 16,
        style: {
          color: 'var(--text-secondary)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-body-strong)'
        }
      }, s.name), /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-helper)',
          color: 'var(--text-secondary)',
          fontWeight: 400
        }
      }, "Giao ", s.lead, " ng\xE0y \xB7 ", s.contact), /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: 'auto',
          font: 'var(--type-helper)',
          color: 'var(--text-secondary)',
          fontWeight: 400
        }
      }, n, " m\u1EB7t h\xE0ng c\u1EA7n \u0111\u1EB7t"), /*#__PURE__*/React.createElement(R.Button, {
        size: "sm",
        variant: "secondary",
        disabled: !n,
        onClick: () => order(rs.map(r => r.id))
      }, "T\u1EA1o \u0111\u01A1n cho NCC n\xE0y"));
    },
    columns: [{
      key: 'name',
      header: 'Sản phẩm',
      render: r => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 500
        }
      }, r.name), /*#__PURE__*/React.createElement("div", {
        className: "vb-code",
        style: {
          font: 'var(--type-helper)',
          color: 'var(--text-secondary)'
        }
      }, r.id))
    }, {
      key: 'stock',
      header: 'Tồn',
      numeric: true,
      width: 64,
      render: r => fmt(r.stock)
    }, {
      key: 'inc',
      header: 'Đang về',
      numeric: true,
      width: 72,
      render: r => r.inc ? fmt(r.inc) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)'
        }
      }, "0")
    }, {
      key: 'rop',
      header: 'ROP',
      numeric: true,
      width: 60,
      render: r => fmt(r.rop)
    }, {
      key: 'eoq',
      header: 'EOQ',
      numeric: true,
      width: 64,
      render: r => fmt(r.eoq)
    }, {
      key: 'days',
      header: 'Còn (ngày)',
      numeric: true,
      width: 124,
      render: r => /*#__PURE__*/React.createElement(DaysCell, {
        r: r
      })
    }, {
      key: 'p',
      header: 'Ưu tiên',
      width: 108,
      render: r => /*#__PURE__*/React.createElement(R.PriorityChip, {
        priority: r.p
      })
    }, {
      key: 'qty',
      header: 'SL đề xuất',
      numeric: true,
      width: 124,
      render: r => ordered.includes(r.id) ? /*#__PURE__*/React.createElement(R.StatusBadge, {
        status: "info",
        label: "\u0110\xE3 t\u1EA1o \u0111\u01A1n",
        icon: "send"
      }) : /*#__PURE__*/React.createElement(QtyInput, {
        value: r.qty,
        unit: r.unit,
        changed: r.qty !== r.orig,
        onChange: v => setQty(r.id, v)
      })
    }, {
      key: 'reason',
      header: 'Lý do điều chỉnh',
      width: '26%',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          font: 'var(--type-helper)',
          color: r.qty !== r.orig ? 'var(--amber-700)' : 'var(--text-secondary)',
          padding: '6px 0',
          textWrap: 'pretty'
        }
      }, r.qty !== r.orig ? `Quản lý sửa ${fmt(r.orig)} → ${fmt(r.qty)}.` : r.reason)
    }],
    rows: vis
  }));
}
window.RestockProposal = RestockProposal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/manager/restock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/warehouse/data.js
try { (() => {
// Vibasic sample data — warehouse tablet kit
window.VB = window.VibasicDesignSystem_90e71f;
window.STAFF_NAV = [{
  key: 'issue',
  label: 'Xuất kho',
  icon: 'package-minus'
}, {
  key: 'receipt',
  label: 'Nhập kho',
  icon: 'package-plus'
}, {
  key: 'lookup',
  label: 'Tra cứu lô',
  icon: 'layers'
}, {
  key: 'stocktake',
  label: 'Kiểm kê',
  icon: 'list-checks',
  count: 1
}, {
  key: 'abnormal',
  label: 'Báo lỗi',
  icon: 'shield-alert'
}];
window.ORDERS = [{
  id: 'DH-2611-0107',
  customer: 'Nhà hàng Mộc Gia',
  due: 'Giao 04/11 · 08:00',
  lines: 3,
  qty: 34,
  urgent: true
}, {
  id: 'DH-2611-0109',
  customer: 'Showroom Quận 7',
  due: 'Giao 04/11 · 14:00',
  lines: 2,
  qty: 18
}, {
  id: 'DH-2611-0112',
  customer: 'Khách sạn Lá Phong',
  due: 'Giao 05/11',
  lines: 5,
  qty: 120
}];

// FIFO lots per line, oldest first. Locked lots are skipped by the system.
const mk = (sku, lot, n, start = 1) => Array.from({
  length: n
}, (_, i) => `SP-${sku}-${lot.slice(4)}-${String(start + i).padStart(4, '0')}`);
window.ISSUE_LINES = [{
  sku: 'GS-02',
  name: 'Ghế ăn gỗ sồi',
  unit: 'cái',
  qty: 24,
  lots: [{
    lot: 'LOT-2608-031',
    received: '28/08/2026',
    age: 67,
    loc: 'Kệ B-04',
    available: 18,
    locked: true
  }, {
    lot: 'LOT-2609-014',
    received: '14/09/2026',
    age: 50,
    loc: 'Kệ B-03',
    available: 20,
    take: 20,
    items: mk('GS02', 'LOT-2609-014', 20, 1)
  }, {
    lot: 'LOT-2610-006',
    received: '06/10/2026',
    age: 28,
    loc: 'Kệ B-05',
    available: 40,
    take: 4,
    items: mk('GS02', 'LOT-2610-006', 4, 1)
  }]
}, {
  sku: 'BA-12',
  name: 'Bàn ăn gỗ óc chó 1m6',
  unit: 'cái',
  qty: 4,
  lots: [{
    lot: 'LOT-2609-022',
    received: '19/09/2026',
    age: 45,
    loc: 'Khu D-01',
    available: 6,
    take: 4,
    items: mk('BA12', 'LOT-2609-022', 4, 3)
  }]
}, {
  sku: 'TD-08',
  name: 'Tủ đầu giường gỗ sồi',
  unit: 'cái',
  qty: 6,
  lots: [{
    lot: 'LOT-2607-040',
    received: '22/07/2026',
    age: 104,
    loc: 'Kệ C-02',
    available: 2,
    take: 2,
    items: mk('TD08', 'LOT-2607-040', 2, 9)
  }, {
    lot: 'LOT-2609-031',
    received: '27/09/2026',
    age: 37,
    loc: 'Kệ C-02',
    available: 10,
    take: 4,
    items: mk('TD08', 'LOT-2609-031', 4, 1)
  }]
}];
window.DEFECT_CODE = 'SP-GS02-2609-0007';
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/warehouse/data.js", error: String((e && e.message) || e) }); }

// ui_kits/warehouse/goods-issue.jsx
try { (() => {
const W = window.VB;
const STEPS = [{
  key: 'select',
  label: 'Chọn đơn'
}, {
  key: 'pick',
  label: 'Lấy hàng FIFO'
}, {
  key: 'review',
  label: 'Gửi duyệt'
}, {
  key: 'deliver',
  label: 'Giao hàng'
}];
function FlowSteps({
  step
}) {
  const idx = STEPS.findIndex(s => s.key === step);
  return /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 6
    }
  }, STEPS.map((s, i) => {
    const done = i < idx || step === 'done',
      cur = i === idx;
    return /*#__PURE__*/React.createElement("li", {
      key: s.key,
      "aria-current": cur ? 'step' : undefined,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 48,
        padding: '0 14px',
        background: cur ? 'var(--grey-900)' : done ? 'var(--green-50)' : '#fff',
        color: cur ? '#fff' : done ? 'var(--green-800)' : 'var(--text-secondary)',
        border: '1px solid ' + (cur ? 'var(--grey-900)' : done ? 'var(--green-200)' : 'var(--border-default)'),
        clipPath: i ? undefined : 'polygon(var(--chamfer) 0,100% 0,100% 100%,0 100%,0 var(--chamfer))'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        display: 'grid',
        placeItems: 'center',
        border: '1.5px solid currentColor',
        font: '600 14px/1 var(--font-sans)',
        flex: 'none'
      }
    }, done ? /*#__PURE__*/React.createElement(W.Icon, {
      name: "check",
      size: 16,
      strokeWidth: 2.5
    }) : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 16px/20px var(--font-sans)'
      }
    }, s.label));
  }));
}
function SelectOrder({
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-touch-heading)'
    }
  }, "\u0110\u01A1n h\xE0ng c\u1EA7n xu\u1EA5t h\xF4m nay"), ORDERS.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.id,
    type: "button",
    className: "vb-clickable",
    onClick: () => onPick(o),
    style: {
      all: 'unset',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      minHeight: 88,
      padding: '16px 20px',
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement(W.Icon, {
    name: "clipboard-list",
    size: 28,
    style: {
      color: 'var(--text-secondary)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "vb-code",
    style: {
      font: '600 18px/24px var(--font-sans)'
    }
  }, o.id), o.urgent && /*#__PURE__*/React.createElement(W.StatusBadge, {
    status: "pending",
    label: "Giao s\u1EDBm nh\u1EA5t",
    icon: "clock"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-touch-body)',
      color: 'var(--text-secondary)'
    }
  }, o.customer, " \xB7 ", o.due)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      font: 'var(--type-touch-body)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement("b", null, o.qty), " s\u1EA3n ph\u1EA9m", /*#__PURE__*/React.createElement("div", {
    style: {
      font: '400 14px/20px var(--font-sans)',
      color: 'var(--text-secondary)'
    }
  }, o.lines, " d\xF2ng h\xE0ng")), /*#__PURE__*/React.createElement(W.Icon, {
    name: "chevron-right",
    size: 24,
    style: {
      color: 'var(--text-muted)'
    }
  }))));
}
function lineProgress(line, scanned) {
  return line.lots.reduce((s, l) => s + (l.items || []).filter(c => scanned.includes(c)).length, 0);
}
function PickScreen({
  order,
  lines,
  setLines,
  scanned,
  setScanned,
  defects,
  setDefects,
  onNext,
  toast
}) {
  const [active, setActive] = React.useState(0);
  const [code, setCode] = React.useState('');
  const [fb, setFb] = React.useState({
    state: 'idle',
    message: 'Quét mã trên tem sản phẩm. Hệ thống chỉ nhận lô cũ nhất còn hàng.'
  });
  const [scanKey, setScanKey] = React.useState(0);
  const [defectOpen, setDefectOpen] = React.useState(false);
  const line = lines[active];
  const openLots = line.lots.filter(l => !l.locked);
  const curLot = openLots.find(l => l.items.filter(c => scanned.includes(c)).length < l.take);
  const allDone = lines.every(l => lineProgress(l, scanned) >= l.qty);
  const submit = raw => {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    setScanKey(k => k + 1);
    setCode('');
    if (defects.includes(c)) return setFb({
      state: 'error',
      message: `${c} đã báo lỗi — không được xuất.`
    });
    if (scanned.includes(c)) return setFb({
      state: 'error',
      message: `${c} đã được quét trước đó.`
    });
    const owner = line.lots.find(l => (l.items || []).includes(c));
    if (!owner) {
      const locked = line.lots.find(l => l.locked && c.includes(l.lot.slice(4)));
      return setFb({
        state: 'error',
        message: locked ? `Lô ${locked.lot} đang khoá — không được xuất.` : `Không tìm thấy ${c} trong dòng hàng ${line.sku}.`
      });
    }
    if (curLot && owner !== curLot) return setFb({
      state: 'error',
      message: `Sai thứ tự FIFO: lấy hết lô ${curLot.lot} (${curLot.loc}) trước.`
    });
    const ns = [...scanned, c];
    setScanned(ns);
    const done = lineProgress(line, ns);
    setFb({
      state: 'success',
      message: `Đúng lô ${owner.lot} · đã quét ${done}/${line.qty} ${line.unit}`
    });
    if (done >= line.qty) {
      const nx = lines.findIndex(l => lineProgress(l, ns) < l.qty);
      if (nx >= 0) setTimeout(() => setActive(nx), 700);
    }
  };
  const simulate = kind => {
    if (kind === 'ok' && curLot) return submit(curLot.items.find(c => !scanned.includes(c)));
    if (kind === 'fifo') {
      const later = openLots[openLots.length - 1];
      return submit(later.items[later.items.length - 1]);
    }
    if (kind === 'locked') {
      const lk = line.lots.find(l => l.locked) || lines[0].lots[0];
      return submit(`SP-${line.sku.replace('-', '')}-${lk.lot.slice(4)}-0003`);
    }
  };
  const reportDefect = reason => {
    const bad = [...scanned].reverse().find(c => line.lots.some(l => (l.items || []).includes(c)));
    if (!bad) return setDefectOpen(false);
    // Defective unit leaves this lot; replacement comes from the next open lot (FIFO).
    setLines(ls => ls.map((l, i) => {
      if (i !== active) return l;
      const lots = l.lots.map(x => ({
        ...x,
        items: [...(x.items || [])]
      }));
      const from = lots.find(x => x.items.includes(bad));
      const fi = lots.indexOf(from);
      const to = lots.slice(fi).find(x => !x.locked && x.available > x.take && x !== from) || lots.slice(fi + 1).find(x => !x.locked);
      from.take -= 1;
      from.items = from.items.filter(c => c !== bad);
      if (to) {
        to.take += 1;
        const n = to.items.length + 1;
        to.items.push(`SP-${l.sku.replace('-', '')}-${to.lot.slice(4)}-${String(n + (to.lot === 'LOT-2610-006' ? 0 : 10)).padStart(4, '0')}`);
      }
      return {
        ...l,
        lots
      };
    }));
    setScanned(s => s.filter(c => c !== bad));
    setDefects(d => [...d, bad]);
    setDefectOpen(false);
    setFb({
      state: 'idle',
      message: `Đã loại ${bad}. Lấy 1 sản phẩm thay thế theo thứ tự FIFO.`
    });
    toast({
      tone: 'warning',
      title: `Đã báo lỗi ${bad}`,
      message: `Lý do: ${reason} · chờ quản lý xử lý`
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '320px minmax(0,1fr)',
      gap: 16,
      height: '100%',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-overline)',
      letterSpacing: 'var(--tracking-overline)',
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
      padding: '4px 2px'
    }
  }, order.id, " \xB7 ", order.customer), lines.map((l, i) => {
    const p = lineProgress(l, scanned),
      done = p >= l.qty,
      cur = i === active;
    return /*#__PURE__*/React.createElement("button", {
      key: l.sku,
      type: "button",
      onClick: () => {
        setActive(i);
        setFb({
          state: 'idle',
          message: 'Quét mã trên tem sản phẩm. Hệ thống chỉ nhận lô cũ nhất còn hàng.'
        });
      },
      "aria-current": cur || undefined,
      style: {
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 72,
        padding: '12px 14px',
        background: cur ? '#fff' : done ? 'var(--green-50)' : 'transparent',
        border: cur ? '2px solid var(--grey-900)' : '1px solid ' + (done ? 'var(--green-200)' : 'var(--border-default)'),
        borderRadius: 'var(--radius-lg)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        flex: 'none',
        display: 'grid',
        placeItems: 'center',
        background: done ? 'var(--green-500)' : 'var(--grey-100)',
        color: done ? '#fff' : 'var(--grey-600)'
      }
    }, done ? /*#__PURE__*/React.createElement(W.Icon, {
      name: "check",
      size: 18,
      strokeWidth: 2.5
    }) : /*#__PURE__*/React.createElement(W.Icon, {
      name: "package",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 16px/22px var(--font-sans)'
      }
    }, l.name), /*#__PURE__*/React.createElement("div", {
      className: "vb-code",
      style: {
        font: '400 13px/18px var(--font-sans)',
        color: 'var(--text-secondary)'
      }
    }, l.sku)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 18px/24px var(--font-sans)',
        fontVariantNumeric: 'tabular-nums',
        color: done ? 'var(--green-700)' : undefined
      }
    }, p, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontWeight: 400
      }
    }, "/", l.qty)));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, defects.length > 0 && /*#__PURE__*/React.createElement(W.AlertBanner, {
    tone: "warning",
    title: `${defects.length} sản phẩm báo lỗi`
  }, defects.join(', ')), /*#__PURE__*/React.createElement(W.Button, {
    size: "xl",
    fullWidth: true,
    iconRight: "arrow-right",
    disabled: !allDone,
    onClick: onNext
  }, "Ti\u1EBFp t\u1EE5c: G\u1EEDi duy\u1EC7t"))), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-touch-heading)'
    }
  }, line.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-touch-body)',
      color: 'var(--text-secondary)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "C\u1EA7n xu\u1EA5t ", line.qty, " ", line.unit, " \xB7 ", openLots.length, " l\xF4 theo th\u1EE9 t\u1EF1 nh\u1EADp c\u0169 nh\u1EA5t")), /*#__PURE__*/React.createElement(W.Button, {
    size: "lg",
    variant: "danger-outline",
    icon: "shield-alert",
    onClick: () => setDefectOpen(true),
    disabled: lineProgress(line, scanned) === 0
  }, "B\xE1o h\xE0ng l\u1ED7i")), /*#__PURE__*/React.createElement(W.ScanInput, {
    value: code,
    onChange: setCode,
    onSubmit: submit,
    state: fb.state,
    message: fb.message,
    scanKey: scanKey,
    onCamera: () => simulate('ok'),
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      font: 'var(--type-helper)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(W.Icon, {
    name: "circle-help",
    size: 14
  }), "M\xF4 ph\u1ECFng m\xE1y qu\xE9t:", /*#__PURE__*/React.createElement(W.Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => simulate('ok'),
    disabled: !curLot
  }, "Qu\xE9t \u0111\xFAng"), /*#__PURE__*/React.createElement(W.Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => simulate('fifo'),
    disabled: openLots.length < 2
  }, "Qu\xE9t sai l\xF4"), /*#__PURE__*/React.createElement(W.Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => simulate('locked')
  }, "Qu\xE9t l\xF4 b\u1ECB kho\xE1")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      overflow: 'auto',
      minHeight: 0,
      paddingBottom: 4
    }
  }, (() => {
    let n = 0;
    return line.lots.map(l => {
      const picked = l.locked ? 0 : l.items.filter(c => scanned.includes(c)).length;
      const st = l.locked ? 'locked' : picked >= l.take ? 'done' : l === curLot ? 'picking' : 'waiting';
      return /*#__PURE__*/React.createElement(W.LotCard, {
        key: l.lot,
        size: "lg",
        fifoOrder: l.locked ? '–' : ++n,
        lotCode: l.lot,
        productName: l.locked ? 'Khoá theo báo cáo BC-2611-0004 · hệ thống bỏ qua lô này' : undefined,
        receivedAt: l.received,
        ageDays: l.age,
        location: l.loc,
        available: l.available,
        toPick: l.locked ? undefined : l.take,
        picked: picked,
        unit: line.unit,
        state: st
      });
    });
  })())), defectOpen && /*#__PURE__*/React.createElement(W.ConfirmDialog, {
    tone: "danger",
    title: "B\xE1o s\u1EA3n ph\u1EA9m l\u1ED7i?",
    description: `Sản phẩm vừa quét sẽ bị loại khỏi phiếu xuất và chờ quản lý xử lý. Hệ thống đề xuất sản phẩm thay thế theo FIFO.`,
    requireReason: true,
    reasonLabel: "M\xF4 t\u1EA3 l\u1ED7i",
    reasonPlaceholder: "VD: n\u1EE9t ch\xE2n gh\u1EBF, tr\u1EA7y m\u1EB7t b\xE0n\u2026",
    confirmLabel: "B\xE1o l\u1ED7i & thay th\u1EBF",
    onCancel: () => setDefectOpen(false),
    onConfirm: reportDefect
  }));
}
function Review({
  order,
  lines,
  scanned,
  defects,
  status,
  setStatus,
  onDeliver
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 340px',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-touch-heading)'
    }
  }, "Phi\u1EBFu xu\u1EA5t PX-2611-0042"), /*#__PURE__*/React.createElement(W.StatusBadge, {
    status: status,
    size: "lg"
  })), lines.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.sku,
    style: {
      padding: '12px 18px',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 16px/22px var(--font-sans)'
    }
  }, l.name, " ", /*#__PURE__*/React.createElement("span", {
    className: "vb-code",
    style: {
      fontWeight: 400,
      color: 'var(--text-secondary)'
    }
  }, "\xB7 ", l.sku)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 6,
      flexWrap: 'wrap'
    }
  }, l.lots.filter(x => !x.locked && x.take > 0).map(x => /*#__PURE__*/React.createElement("span", {
    key: x.lot,
    className: "vb-code",
    style: {
      padding: '3px 8px',
      background: 'var(--grey-50)',
      border: '1px solid var(--border-default)',
      font: '500 13px/18px var(--font-sans)'
    }
  }, x.lot, " \xD7 ", x.take)))), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 20px/28px var(--font-sans)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, lineProgress(l, scanned), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-touch-body)',
      color: 'var(--text-secondary)'
    }
  }, l.unit)))), defects.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(W.AlertBanner, {
    tone: "warning",
    title: `Đã thay ${defects.length} sản phẩm lỗi`
  }, defects.join(', '), " \u2014 b\xE1o c\xE1o b\u1EA5t th\u01B0\u1EDDng \u0111\xE3 g\u1EEDi qu\u1EA3n l\xFD."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement(W.ApprovalStepper, {
    size: "lg",
    orientation: "vertical",
    status: status,
    history: {
      draft: {
        by: 'Lê Văn Tâm',
        at: '03/11 09:14'
      },
      ...(status !== 'draft' ? {
        pending: {
          by: 'Gửi Nguyễn Thu Hà',
          at: '09:16'
        }
      } : {}),
      ...(status === 'approved' ? {
        approved: {
          by: 'Nguyễn Thu Hà',
          at: '09:21'
        }
      } : {})
    }
  }), status === 'draft' && /*#__PURE__*/React.createElement(W.Button, {
    size: "xl",
    fullWidth: true,
    icon: "send",
    onClick: () => setStatus('pending')
  }, "G\u1EEDi qu\u1EA3n l\xFD duy\u1EC7t"), status === 'pending' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(W.AlertBanner, {
    tone: "info",
    title: "\u0110ang ch\u1EDD qu\u1EA3n l\xFD duy\u1EC7t"
  }, "B\u1EA1n s\u1EBD nh\u1EADn th\xF4ng b\xE1o khi phi\u1EBFu \u0111\u01B0\u1EE3c duy\u1EC7t."), /*#__PURE__*/React.createElement(W.Button, {
    size: "md",
    variant: "ghost",
    icon: "circle-help",
    onClick: () => setStatus('approved')
  }, "M\xF4 ph\u1ECFng: qu\u1EA3n l\xFD duy\u1EC7t")), status === 'approved' && /*#__PURE__*/React.createElement(W.Button, {
    size: "xl",
    fullWidth: true,
    icon: "truck",
    onClick: onDeliver
  }, "B\xE0n giao cho v\u1EADn chuy\u1EC3n")));
}
function Deliver({
  order,
  onDone
}) {
  const [name, setName] = React.useState('');
  const [ok, setOk] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: 'var(--type-touch-heading)'
    }
  }, "X\xE1c nh\u1EADn giao h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-touch-body)',
      color: 'var(--text-secondary)'
    }
  }, order.id, " \xB7 ", order.customer, " \xB7 ", order.qty, " s\u1EA3n ph\u1EA9m"), /*#__PURE__*/React.createElement(W.TextField, {
    size: "xl",
    label: "Ng\u01B0\u1EDDi nh\u1EADn / t\xE0i x\u1EBF",
    required: true,
    value: name,
    onChange: e => setName(e.target.value),
    placeholder: "H\u1ECD t\xEAn",
    error: tried && !name ? 'Nhập tên người nhận hàng.' : undefined
  }), /*#__PURE__*/React.createElement(W.Checkbox, {
    size: "lg",
    label: "\u0110\xE3 ki\u1EC3m \u0111\u1EE7 s\u1ED1 l\u01B0\u1EE3ng v\xE0 t\xECnh tr\u1EA1ng khi b\xE0n giao",
    checked: ok,
    onChange: e => setOk(e.target.checked)
  }), /*#__PURE__*/React.createElement(W.Button, {
    size: "xl",
    fullWidth: true,
    icon: "check",
    onClick: () => {
      setTried(true);
      if (name && ok) onDone();
    }
  }, "X\xE1c nh\u1EADn \u0111\xE3 giao"));
}
Object.assign(window, {
  FlowSteps,
  SelectOrder,
  PickScreen,
  Review,
  Deliver,
  lineProgress
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/warehouse/goods-issue.jsx", error: String((e && e.message) || e) }); }

// ui_kits/warehouse/warehouse-app.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const S = window.VB;
function WarehouseApp() {
  const [tab, setTab] = React.useState('issue');
  const [step, setStep] = React.useState(() => localStorage.getItem('vb-wh-step') || 'pick');
  const [order, setOrder] = React.useState(ORDERS[0]);
  const [lines, setLines] = React.useState(ISSUE_LINES);
  // Start mid-task: 12 chairs scanned, table line complete.
  const [scanned, setScanned] = React.useState(() => [...ISSUE_LINES[0].lots[1].items.slice(0, 12), ...ISSUE_LINES[1].lots[0].items]);
  const [defects, setDefects] = React.useState([]);
  const [status, setStatus] = React.useState('draft');
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    localStorage.setItem('vb-wh-step', step);
  }, [step]);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const reset = () => {
    setStep('select');
    setLines(ISSUE_LINES);
    setScanned([]);
    setDefects([]);
    setStatus('draft');
  };
  return /*#__PURE__*/React.createElement(S.AppShell, {
    role: "staff",
    navItems: STAFF_NAV,
    activeKey: tab,
    onNavigate: setTab,
    user: {
      name: 'Lê Văn Tâm'
    },
    title: tab === 'issue' ? 'Xuất kho theo FIFO' : STAFF_NAV.find(n => n.key === tab).label,
    subtitle: "Kho B\xECnh D\u01B0\u01A1ng \xB7 Ca s\xE1ng",
    brand: /*#__PURE__*/React.createElement("img", {
      src: "../../assets/mark-white.png",
      alt: "Vibasic",
      style: {
        height: 24
      }
    }),
    actions: tab === 'issue' && step !== 'select' ? /*#__PURE__*/React.createElement(S.Button, {
      size: "lg",
      variant: "secondary",
      icon: "undo-2",
      onClick: reset
    }, "\u0110\u01A1n kh\xE1c") : null
  }, tab !== 'issue' ? /*#__PURE__*/React.createElement(S.EmptyState, {
    size: "lg",
    icon: "square-pen",
    title: "M\xE0n h\xECnh ch\u01B0a c\xF3 trong b\u1EA3n th\u1EED",
    description: "B\u1EA3n UI th\u1EED cho nh\xE2n vi\xEAn kho t\u1EADp trung v\xE0o lu\u1ED3ng xu\u1EA5t kho FIFO.",
    action: /*#__PURE__*/React.createElement(S.Button, {
      size: "lg",
      onClick: () => setTab('issue')
    }, "V\u1EC1 Xu\u1EA5t kho")
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      height: '100%',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(FlowSteps, {
    step: step
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0
    }
  }, step === 'select' && /*#__PURE__*/React.createElement(SelectOrder, {
    onPick: o => {
      setOrder(o);
      setStep('pick');
    }
  }), step === 'pick' && /*#__PURE__*/React.createElement(PickScreen, {
    order: order,
    lines: lines,
    setLines: setLines,
    scanned: scanned,
    setScanned: setScanned,
    defects: defects,
    setDefects: setDefects,
    onNext: () => setStep('review'),
    toast: setToast
  }), step === 'review' && /*#__PURE__*/React.createElement(Review, {
    order: order,
    lines: lines,
    scanned: scanned,
    defects: defects,
    status: status,
    setStatus: setStatus,
    onDeliver: () => setStep('deliver')
  }), step === 'deliver' && /*#__PURE__*/React.createElement(Deliver, {
    order: order,
    onDone: () => {
      setStep('done');
      setToast({
        tone: 'success',
        title: `Đã giao ${order.id}`,
        message: 'Tồn kho đã cập nhật.'
      });
    }
  }), step === 'done' && /*#__PURE__*/React.createElement(S.EmptyState, {
    size: "lg",
    icon: "circle-check",
    title: "Ho\xE0n t\u1EA5t xu\u1EA5t kho",
    description: `${order.id} đã bàn giao. Phiếu PX-2611-0042 đã lưu vào lịch sử.`,
    action: /*#__PURE__*/React.createElement(S.Button, {
      size: "xl",
      icon: "clipboard-list",
      onClick: reset
    }, "Xu\u1EA5t \u0111\u01A1n ti\u1EBFp theo")
  }))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 88,
      transform: 'translateX(-50%)',
      zIndex: 60
    }
  }, /*#__PURE__*/React.createElement(S.Toast, _extends({}, toast, {
    onClose: () => setToast(null)
  }))));
}
function TabletFrame({
  children
}) {
  const W = 1180,
    H = 820;
  const [k, setK] = React.useState(1);
  React.useEffect(() => {
    const f = () => setK(Math.min(1, (window.innerWidth - 32) / (W + 28), (window.innerHeight - 32) / (H + 28)));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100vw',
      height: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--grey-200)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: (W + 28) * k,
      height: (H + 28) * k
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: W + 28,
      height: H + 28,
      padding: 14,
      background: '#1b1f24',
      borderRadius: 28,
      transform: `scale(${k})`,
      transformOrigin: 'top left',
      boxShadow: '0 20px 50px rgba(22,27,34,.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: W,
      height: H,
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--surface-page)',
      position: 'relative',
      transform: 'translateZ(0)'
    }
  }, children))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(TabletFrame, null, /*#__PURE__*/React.createElement(WarehouseApp, null)));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/warehouse/warehouse-app.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.FilterBar = __ds_scope.FilterBar;

__ds_ns.KpiTile = __ds_scope.KpiTile;

__ds_ns.LotCard = __ds_scope.LotCard;

__ds_ns.AlertBanner = __ds_scope.AlertBanner;

__ds_ns.ConfirmDialog = __ds_scope.ConfirmDialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.QuantityStepper = __ds_scope.QuantityStepper;

__ds_ns.ScanInput = __ds_scope.ScanInput;

__ds_ns.SelectField = __ds_scope.SelectField;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.ApprovalStepper = __ds_scope.ApprovalStepper;

__ds_ns.PriorityChip = __ds_scope.PriorityChip;

__ds_ns.STATUS_META = __ds_scope.STATUS_META;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

})();
