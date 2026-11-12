import { fromPayPal, type Dispute } from './disputes/normalize';
import { getDispute, listDisputes } from './paypal';

// Flat rows for the Dashboard's AG Studio data source: one row per dispute.

const DAY_MS = 86_400_000;

// 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' -> 'Merchandise or service not received'
const humanise = (code: string | null) => (code ? code[0] + code.slice(1).toLowerCase().replaceAll('_', ' ') : null);

export type Urgency = 'Overdue' | '≤ 7 days' | '8–30 days' | '> 30 days';

const urgencyOf = (daysLeft: number | null): Urgency | null => {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return 'Overdue';
  if (daysLeft <= 7) return '≤ 7 days';
  if (daysLeft <= 30) return '8–30 days';
  return '> 30 days';
};

function disputeRow(d: Dispute, asOf: Date) {
  const due = d.sellerResponseDueDate;
  // Whole days left, rounded down so a deadline never looks further away than it is.
  const daysToRespond = due ? Math.floor((Date.parse(due) - asOf.getTime()) / DAY_MS) : null;
  // What PayPal took from the seller, kept apart from the disputed amount.
  const hold = d.moneyMovements.find((m) => m.reason === 'HOLD_PLACED')?.amount ?? null;
  return {
    id: d.id,
    source: d.sourceMode,
    reason: humanise(d.reason),
    status: humanise(d.status),
    stage: humanise(d.stage),
    channel: humanise(d.channel),
    currency: d.disputeAmount?.currencyCode ?? null,
    // Grid display only; the Dispute keeps the exact decimal string.
    amount: d.disputeAmount ? Number(d.disputeAmount.value) : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    sellerResponseDueDate: due,
    daysToRespond,
    urgency: urgencyOf(daysToRespond),
    evidenceRequested: d.evidenceRequested.join(', '),
    evidenceRequestedCount: d.evidenceRequested.length,
    heldCurrency: hold?.currencyCode ?? null,
    heldAmount: hold ? Number(hold.value) : null,
  };
}

export async function getDashboardData(asOf = new Date()) {
  // The list returns summaries; the detail endpoint has amounts, movements and messages.
  const summaries = await listDisputes();
  const disputes = (await Promise.all(summaries.map((s) => getDispute(s.dispute_id)))).map(fromPayPal);

  return {
    asOf: asOf.toISOString(),
    disputes: disputes.map((d) => disputeRow(d, asOf)),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
