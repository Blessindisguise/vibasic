Compact data table for manager screens.
```jsx
<DataTable columns={[{key:'sku',header:'Mã SP'},{key:'name',header:'Sản phẩm'},{key:'stock',header:'Tồn',numeric:true}]}
  rows={rows} selectable selected={sel} onSelectedChange={setSel}
  bulkActions={<Button size="sm">Tạo đơn đặt hàng</Button>} groupBy="supplier" maxHeight={480} />
```
- Numbers right-aligned with tabular figures; status columns use StatusBadge / PriorityChip.
