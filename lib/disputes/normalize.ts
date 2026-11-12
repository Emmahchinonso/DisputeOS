// DisputeOS's own dispute shape. PayPal sandbox disputes are mapped into it here; synthetic demo
// cases are built in it directly, so no field may depend on a live PayPal response.

import type { Link, Money as PayPalMoney, PayPalDispute } from '../paypal';

// Amounts stay decimal strings, as PayPal sends them, so no float rounding creeps in.
export type Money = { currencyCode: string; value: string };

export type SourceMode = 'paypal_sandbox' | 'demo';

export type MoneyMovement = {
  affectedParty: string | null;
  type: string | null;
  reason: string | null;
  amount: Money | null;
  initiatedAt: string | null;
};

export type DisputeMessage = { postedBy: string | null; postedAt: string | null; content: string };

export type DisputedTransaction = {
  sellerTransactionId: string | null;
  createdAt: string | null;
  status: string | null;
  grossAmount: Money | null;
  invoiceNumber: string | null;
  items: { id: string | null; description: string | null; quantity: string | null }[];
};

export type Dispute = {
  id: string;
  sourceMode: SourceMode;
  reason: string | null;
  status: string | null;
  stage: string | null;
  channel: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sellerResponseDueDate: string | null;
  buyerResponseDueDate: string | null;
  // What the buyer disputed, separate from what PayPal actually moved (e.g. a hold net of fees).
  disputeAmount: Money | null;
  moneyMovements: MoneyMovement[];
  transactions: DisputedTransaction[];
  // Evidence types PayPal asked the seller for, e.g. PROOF_OF_FULFILLMENT.
  evidenceRequested: string[];
  evidenceSubmitted: { type: string | null; source: string | null; date: string | null; notes: string | null }[];
  messages: DisputeMessage[];
  // Keys are the actions PayPal allows now (e.g. accept_claim); values are PayPal's option lists.
  allowedResponseOptions: Record<string, unknown>;
  links: Link[];
};

const money = (m?: PayPalMoney | null): Money | null =>
  m?.value === undefined ? null : { currencyCode: m.currency_code, value: m.value };

export function fromPayPal(d: PayPalDispute): Dispute {
  const requested = (e: { source?: string }) => e.source === 'REQUESTED_FROM_SELLER';
  return {
    id: d.dispute_id,
    sourceMode: 'paypal_sandbox',
    reason: d.reason ?? null,
    status: d.status ?? null,
    stage: d.dispute_life_cycle_stage ?? null,
    channel: d.dispute_channel ?? null,
    createdAt: d.create_time ?? null,
    updatedAt: d.update_time ?? null,
    sellerResponseDueDate: d.seller_response_due_date ?? null,
    buyerResponseDueDate: d.buyer_response_due_date ?? null,
    disputeAmount: money(d.dispute_amount),
    moneyMovements: (d.fund_movements ?? []).map((m) => ({
      affectedParty: m.party ?? null,
      type: m.type ?? null,
      reason: m.reason ?? null,
      amount: money(m.amount),
      initiatedAt: m.initiated_time ?? null,
    })),
    // Buyer identity is deliberately not copied: DisputeOS never needs it.
    transactions: (d.disputed_transactions ?? []).map((t) => ({
      sellerTransactionId: t.seller_transaction_id ?? null,
      createdAt: t.create_time ?? null,
      status: t.transaction_status ?? null,
      grossAmount: money(t.gross_amount),
      invoiceNumber: t.invoice_number ?? null,
      items: (t.items ?? []).map((i) => ({
        id: i.item_id ?? null,
        description: i.item_description ?? null,
        quantity: i.item_quantity ?? null,
      })),
    })),
    evidenceRequested: (d.evidences ?? []).filter(requested).flatMap((e) => (e.evidence_type ? [e.evidence_type] : [])),
    evidenceSubmitted: (d.evidences ?? []).filter((e) => !requested(e)).map((e) => ({
      type: e.evidence_type ?? null,
      source: e.source ?? null,
      date: e.date ?? null,
      notes: e.notes ?? null,
    })),
    messages: (d.messages ?? []).map((m) => ({
      postedBy: m.posted_by ?? null,
      postedAt: m.time_posted ?? null,
      content: m.content ?? '',
    })),
    allowedResponseOptions: d.allowed_response_options ?? {},
    links: d.links ?? [],
  };
}
