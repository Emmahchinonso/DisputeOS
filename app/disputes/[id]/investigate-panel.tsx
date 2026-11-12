'use client';

import { useRef, useState } from 'react';
import { Button } from '@/app/dashboard/components/ui/ui';

// Merchant notes in, a cited investigation and an editable draft out. Nothing here is saved or sent.

type Result = {
  summary: string;
  verifiedFacts: { claim: string; sourceIds: string[]; uncited: boolean }[];
  unknowns: string[];
  evidenceGaps: { evidenceType: string; reason: string; priority: 'high' | 'medium' | 'low' }[];
  recommendedActions: { action: string; rationale: string }[];
  draftResponse: string;
  caveats: string[];
  sources: { id: string; label: string }[];
};

const PRIORITY_COLOUR = { high: 'text-pp-danger', medium: 'text-pp-warning', low: 'text-pp-muted' } as const;

function List({ title, items }: { title: string; items: React.ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-pp-muted">{title}</h3>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-[15px]">{items}</ul>
    </div>
  );
}

export function InvestigatePanel({ disputeId }: { disputeId: string }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const investigate = async () => {
    setLoading(true);
    setFailure(null);
    try {
      const res = await fetch(`/api/disputes/${encodeURIComponent(disputeId)}/investigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
      setResult(body as Result);
      setDraft((body as Result).draftResponse);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Investigation failed');
    } finally {
      setLoading(false);
    }
  };

  // Clipboard API first; select-and-copy for browsers that block it.
  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(draft);
      ok = true;
    } catch {
      draftRef.current?.select();
      ok = document.execCommand('copy');
    }
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2500);
  };

  const labelOf = (id: string) => result?.sources.find((s) => s.id === id)?.label ?? id;

  return (
    <section className="rounded-lg border border-pp-border bg-pp-surface p-6">
      <h2 className="text-lg font-semibold text-pp-navy">Investigate</h2>
      <label htmlFor="notes" className="mt-4 block text-sm font-semibold text-pp-ink">
        Merchant notes <span className="font-normal text-pp-muted">(optional, treated as unverified)</span>
      </label>
      <textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="e.g. how and when the order was shipped"
        className="mt-2 w-full rounded-lg border border-pp-border p-3 text-[15px] focus:outline-2 focus:outline-pp-blue"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button variant="primary" onClick={investigate} disabled={loading}>
          {loading ? 'Investigating…' : result ? 'Investigate again' : 'Investigate'}
        </Button>
        {failure && (
          <span className="text-sm text-pp-danger">
            {failure}{' '}
            <button type="button" onClick={investigate} className="font-semibold underline">
              Retry
            </button>
          </span>
        )}
      </div>

      {result && (
        <div className="mt-6 flex flex-col gap-6">
          <p className="text-[15px]">{result.summary}</p>
          <List
            title="Verified facts"
            items={result.verifiedFacts.map((f, i) => (
              <li key={i}>
                {f.claim}{' '}
                {f.uncited ? (
                  <span className="text-xs font-semibold text-pp-danger">[uncited]</span>
                ) : (
                  f.sourceIds.map((id) => (
                    <span
                      key={id}
                      title={id}
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs ${id.startsWith('merchant:') ? 'border border-pp-warning text-pp-warning' : 'bg-pp-highlight text-pp-blue'}`}
                    >
                      {labelOf(id)}
                    </span>
                  ))
                )}
              </li>
            ))}
          />
          <List title="Unknowns" items={result.unknowns.map((u, i) => <li key={i}>{u}</li>)} />
          <List
            title="Evidence gaps"
            items={result.evidenceGaps.map((g, i) => (
              <li key={i}>
                <span className={`font-semibold ${PRIORITY_COLOUR[g.priority]}`}>{g.priority}</span> · {g.evidenceType}: {g.reason}
              </li>
            ))}
          />
          <List
            title="Recommended next steps"
            items={result.recommendedActions.map((a, i) => (
              <li key={i}>
                <span className="font-semibold">{a.action}</span> — {a.rationale}
              </li>
            ))}
          />
          <List title="Caveats" items={result.caveats.map((c, i) => <li key={i}>{c}</li>)} />

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-pp-muted">Draft response</h3>
            <textarea
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="mt-2 w-full rounded-lg border border-pp-border p-3 text-[15px] focus:outline-2 focus:outline-pp-blue"
            />
            <div className="mt-2 flex items-center gap-3">
              <Button size="sm" onClick={copy}>
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </Button>
              {copyState === 'failed' ? (
                <span className="text-sm text-pp-danger">Copy failed — select the text and copy it.</span>
              ) : (
                <span className="text-sm text-pp-muted">Draft is not saved and nothing is sent to PayPal.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
