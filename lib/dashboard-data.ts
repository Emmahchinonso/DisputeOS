import { fromPayPal, type Dispute } from './disputes/normalize';
import { getDispute, listDisputes } from './paypal';

// Flat rows for the Dashboard's AG Studio data source: one row per dispute.

const DAY_MS = 86_400_000;

// 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' -> 'Merchandise or service not received'
const humanise = (code: string | null) => (code ? code[0] + code.slice(1).toLowerCase().replaceAll('_', ' ') : null);

function disputeRow(d: Dispute, asOf: Date) {
  const due = d.sellerResponseDueDate;
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
    daysToRespond: due ? Math.ceil((Date.parse(due) - asOf.getTime()) / DAY_MS) : null,
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
