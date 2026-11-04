Confirmation dialog; rejection always requires a reason.
```jsx
<ConfirmDialog tone="danger" title="Từ chối phiếu PN-2611-0018?" requireReason confirmLabel="Từ chối phiếu" onConfirm={r=>reject(r)} onCancel={close} />
```
