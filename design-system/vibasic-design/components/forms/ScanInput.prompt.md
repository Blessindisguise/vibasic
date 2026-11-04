Barcode scan field — the primary input on warehouse screens. Flashes green on a valid scan, shakes red on a wrong one.
```jsx
<ScanInput value={code} onChange={setCode} onSubmit={verify} state="success" message="Đúng lô LOT-2609-014 · 13/20" onCamera={openCam} scanKey={n} />
```
- Keep focus in the field after each scan; bump `scanKey` to replay feedback.
