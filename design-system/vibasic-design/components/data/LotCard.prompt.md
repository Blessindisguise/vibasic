Lot card for FIFO issuing and lot lookup.
```jsx
<LotCard fifoOrder={1} lotCode="LOT-2609-014" productName="Ghế ăn gỗ sồi GS-02" receivedAt="14/09/2026" ageDays={50} location="Kệ B-03" available={20} toPick={20} picked={13} state="picking" size="lg" />
```
- `locked` lots (quarantined after an abnormal report) are skipped by FIFO and show the dark "Lô đã khoá" badge.
