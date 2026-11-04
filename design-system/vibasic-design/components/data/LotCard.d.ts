/**
 * One lot in a FIFO pick list — order number, lot code, age, location, pick progress.
 * @startingPoint section="Warehouse" subtitle="FIFO lot card with pick progress" viewport="700x340"
 */
export interface LotCardProps {
  /** 1 = oldest lot, pick first */ fifoOrder: number; lotCode: string; productName?: string;
  receivedAt?: string; ageDays?: number; location?: string;
  available?: number; toPick?: number; picked?: number; unit?: string;
  state?: 'next' | 'picking' | 'waiting' | 'done' | 'locked';
  size?: 'md' | 'lg'; onClick?: () => void;
}
export declare function LotCard(props: LotCardProps): JSX.Element;
