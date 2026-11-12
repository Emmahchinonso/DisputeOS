// The numbered facts an investigation may cite, and the check that it cited only those.

import type { Dispute, Money } from '@/lib/disputes/normalize';

export type Source = { id: string; label: string; text: string };

export type CitedFact = { claim: string; sourceIds: string[]; uncited: boolean };

const fmt = (m: Money | null) => (m ? `${m.currencyCode} ${m.value}` : 'unknown');

export function buildSources(d: Dispute, notes: string): Source[] {
  const sources: Source[] = [
    { id: 'paypal:dispute_amount', label: 'PayPal · disputed amount', text: `Disputed amount: ${fmt(d.disputeAmount)}` },
    {
      id: 'paypal:reason',
      label: 'PayPal · reason and stage',
      text: `Reason: ${d.reason ?? 'unknown'}. Stage: ${d.stage ?? 'unknown'}. Status: ${d.status ?? 'unknown'}.`,
    },
    ...d.moneyMovements.map((m, i) => ({
      id: `paypal:fund_movements[${i}]`,
      label: 'PayPal · fund movement',
      text: `${m.affectedParty ?? '?'} ${m.type ?? '?'} ${m.reason ?? '?'} of ${fmt(m.amount)} at ${m.initiatedAt ?? 'unknown time'}`,
    })),
    ...d.evidenceRequested.map((type, i) => ({
      id: `paypal:evidence_requested[${i}]`,
      label: 'PayPal · evidence requested',
      text: `PayPal requested ${type} from the seller. Not yet provided in DisputeOS.`,
    })),
    ...d.messages.map((m, i) => ({
      id: `paypal:messages[${i}]`,
      label: `PayPal · message from ${m.postedBy?.toLowerCase() ?? 'unknown'}`,
      text: `${m.postedBy ?? 'Unknown'} wrote at ${m.postedAt ?? 'unknown time'}: ${m.content}`,
    })),
    {
      id: 'paypal:seller_response_due_date',
      label: 'PayPal · seller deadline',
      text: `Seller response due: ${d.sellerResponseDueDate ?? 'unknown'}`,
    },
  ];
  if (notes.trim()) {
    sources.push({ id: 'merchant:notes', label: 'Merchant notes · unverified', text: notes.trim() });
  }
  return sources;
}

// Drops citations to ids that were never offered; a fact left with none is marked uncited.
export function checkCitations(facts: { claim: string; sourceIds: string[] }[], sources: Source[]): CitedFact[] {
  const known = new Set(sources.map((s) => s.id));
  return facts.map((f) => {
    const sourceIds = f.sourceIds.filter((id) => known.has(id));
    return { claim: f.claim, sourceIds, uncited: sourceIds.length === 0 };
  });
}
