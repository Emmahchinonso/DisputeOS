import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { fromPayPal, type Money } from '@/lib/disputes/normalize';
import { getDispute } from '@/lib/paypal';
import { InvestigatePanel } from './investigate-panel';

export const metadata: Metadata = { title: 'Dispute' };

const DAY_MS = 86_400_000;

const fmt = (m: Money | null) => (m ? `${m.currencyCode} ${m.value}` : '—');
// 'PROOF_OF_FULFILLMENT' -> 'Proof of fulfillment'
const humanise = (code: string | null) => (code ? code[0] + code.slice(1).toLowerCase().replaceAll('_', ' ') : '—');

// '1 Dec 2026, 21:07 UTC — 19 days left'; whole days rounded down so it never looks further away.
function deadline(iso: string | null) {
  if (!iso) return '—';
  const when = new Date(iso);
  const date = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const days = Math.floor((when.getTime() - Date.now()) / DAY_MS);
  const left = days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : `${days} day${days === 1 ? '' : 's'} left`;
  return `${date}, ${time} UTC — ${left}`;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-pp-muted">{label}</dt>
      <dd className="mt-1 text-[15px] text-pp-ink">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-pp-border bg-pp-surface p-6">
      <h2 className="text-lg font-semibold text-pp-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function DisputePage({ params }: PageProps<'/disputes/[id]'>) {
  // Live PayPal data: render per request, not at build time.
  await connection();
  const { id } = await params;
  const d = fromPayPal(await getDispute(id));
  const hold = d.moneyMovements.find((m) => m.reason === 'HOLD_PLACED');

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8 font-paypal text-pp-ink">
      <Link href="/dashboard" className="text-sm font-semibold text-pp-blue hover:underline">
        ← Back to dashboard
      </Link>
      <header>
        <p className="text-sm text-pp-muted">PayPal sandbox dispute</p>
        <h1 className="font-mono text-[28px] font-semibold text-pp-navy">{d.id}</h1>
        <p className="mt-1 text-[15px] text-pp-muted">{humanise(d.reason)}</p>
      </header>

      <Section title="PayPal's facts">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Fact label="Disputed amount">{fmt(d.disputeAmount)}</Fact>
          <Fact label="Held from seller">
            {hold ? `${fmt(hold.amount)} (${humanise(hold.reason)})` : 'No hold recorded'}
          </Fact>
          <Fact label="Stage / status">
            {humanise(d.stage)} · {humanise(d.status)}
          </Fact>
          <Fact label="Seller response deadline">{deadline(d.sellerResponseDueDate)}</Fact>
        </dl>
      </Section>

      <Section title="Evidence PayPal requested">
        {d.evidenceRequested.length === 0 ? (
          <p className="text-[15px] text-pp-muted">None requested.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {d.evidenceRequested.map((type) => (
              <li key={type} className="rounded-full border border-pp-warning px-3 py-1 text-sm text-pp-warning">
                {humanise(type)} · Not yet provided in DisputeOS
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Messages">
        {d.messages.length === 0 ? (
          <p className="text-[15px] text-pp-muted">No messages.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.messages.map((m, i) => (
              <li key={i} className="rounded-lg bg-pp-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-pp-muted">
                  {humanise(m.postedBy)} · {m.postedAt ? new Date(m.postedAt).toUTCString() : 'unknown time'}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[15px]">{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Responses PayPal allows (read-only)">
        <ul className="flex flex-col gap-2 text-[15px]">
          {Object.entries(d.allowedResponseOptions).map(([option, detail]) => (
            <li key={option}>
              <span className="font-semibold">{humanise(option.toUpperCase())}</span>
              <span className="text-pp-muted">
                {' '}
                {Object.values(detail as Record<string, string[]>)
                  .flat()
                  .map((v) => humanise(v))
                  .join(', ')}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-pp-muted">DisputeOS does not send any response to PayPal.</p>
      </Section>

      <InvestigatePanel disputeId={d.id} />
    </main>
  );
}
