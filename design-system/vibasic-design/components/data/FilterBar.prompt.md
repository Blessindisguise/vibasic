Filter bar above DataTable.
```jsx
<FilterBar search={q} onSearchChange={setQ} filters={[{key:'prio',label:'Ưu tiên',value:p,options:[{value:'urgent',label:'Khẩn cấp'}]}]} onFilterChange={...} resultCount={24} actions={<Button variant="secondary" icon="download">Xuất Excel</Button>} />
```
