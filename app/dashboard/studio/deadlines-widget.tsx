'use client';

// "Response deadlines": one card per open dispute, nearest seller deadline first.
// Reads the dispute rows from Studio's `context`, not widgetApi.getData, so Studio filters don't narrow it.
// TODO: move to widgetApi.getData if cross-filtering is wanted.

import type { AgBaseWidgetDefinition, AgDefaultRegistry, AgWidgetParams } from 'ag-studio';
import type { DashboardData, Urgency } from '@/lib/dashboard-data';

export const DEADLINES_WIDGET = 'response-deadlines';

export type DisputeRegistry = Omit<AgDefaultRegistry, 'widgets'> & {
  widgets: readonly (AgDefaultRegistry['widgets'][number] | AgBaseWidgetDefinition<typeof DEADLINES_WIDGET>)[];
};

export type StudioContext = { disputes: DashboardData['disputes'] };

const URGENCY_COLOUR: Record<Urgency, string> = {
  Overdue: 'var(--pp-danger)',
  '≤ 7 days': 'var(--pp-danger)',
  '8–30 days': 'var(--pp-warning)',
  '> 30 days': 'var(--pp-success)',
};

const SOURCE_LABEL = { paypal_sandbox: 'PayPal sandbox', demo: 'Demo' } as const;

// 'PROOF_OF_FULFILLMENT' -> 'Proof of fulfillment'
const humanise = (code: string) => code[0] + code.slice(1).toLowerCase().replaceAll('_', ' ');

const daysLabel = (days: number) =>
  days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : `${days} day${days === 1 ? '' : 's'} left`;

function ResponseDeadlines({ context }: AgWidgetParams) {
  const disputes = ((context as StudioContext | undefined)?.disputes ?? [])
    .filter((d) => d.status !== 'Resolved' && d.daysToRespond !== null)
    .sort((a, b) => a.daysToRespond! - b.daysToRespond!);

  if (disputes.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-pp-muted">No open disputes</div>;
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      {disputes.map((d) => {
        const colour = d.urgency ? URGENCY_COLOUR[d.urgency] : 'var(--pp-muted)';
        const evidence = d.evidenceRequested ? d.evidenceRequested.split(', ') : [];
        return (
          <div key={d.id} className="rounded-lg border border-pp-border bg-pp-surface p-3" style={{ borderLeft: `4px solid ${colour}` }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-pp-navy">{d.id}</span>
              <span className="text-sm font-semibold" style={{ color: colour }}>
                {daysLabel(d.daysToRespond!)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 text-sm text-pp-muted">
              <span>
                {d.currency} {d.amount?.toFixed(2)} · {d.reason}
              </span>
              <span className="rounded-full bg-pp-canvas px-2 py-0.5 text-xs">{SOURCE_LABEL[d.source]}</span>
            </div>
            {evidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {evidence.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={{ borderColor: 'var(--pp-warning)', color: 'var(--pp-warning)' }}
                    title={type}
                  >
                    {humanise(type)} · Not yet provided
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const deadlinesWidget: AgBaseWidgetDefinition<typeof DEADLINES_WIDGET> = {
  id: DEADLINES_WIDGET,
  label: 'Response deadlines',
  form: (params) => params.createDefaults({}),
  comp: ResponseDeadlines,
  defaultSize: { width: 480, height: 360 },
  minSize: { width: 280, height: 160 },
  ai: {
    description: 'Cards for each open dispute, nearest seller response deadline first, with requested evidence not yet provided.',
    usage: 'Use to show which disputes need a seller response soonest. It takes no fields.',
  },
};
