Form text field with label above, helper or error below.
```jsx
<TextField label="Số lượng nhận" required suffix="cái" inputMode="numeric" />
<TextField label="Mã lô" error="Mã lô không tồn tại trong kho." />
```
- Required fields show a red asterisk; errors are specific and say how to fix.
