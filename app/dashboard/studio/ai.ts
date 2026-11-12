// The AG Studio AI assistant. The adapter calls `${endpoint}/responses`, i.e. this app's proxy at
// app/api/ai/responses, which holds the OpenAI key, so nothing secret is sent from the browser.

import {
  createAiHarness,
  directLlmRunner,
  type AgAiHarnessSetup,
  type AgAiPromptStarter,
  type AgStudioApi,
} from 'ag-studio';
import type { DashboardData } from '@/lib/dashboard-data';
import { openaiAdapter } from './openai-adapter';

type DisputeRow = DashboardData['disputes'][number];

// Suggestions shown in a new AI conversation, before anything has been typed.
const PROMPT_STARTERS: AgAiPromptStarter[] = [
  {
    label: 'Needs action soonest',
    prompt: 'Which disputes need action soonest and what evidence is missing?',
  },
  {
    label: 'Due this week',
    prompt: 'Show only disputes with a seller deadline in the next 7 days.',
  },
  {
    label: 'Summarise this page',
    prompt: 'Summarise what this page shows: every widget, the fields it reads, and what stands out.',
  },
];

// Read-only: answers from the rows already loaded for the dashboard and changes nothing.
const findDisputesTool = (api: AgStudioApi, disputes: DisputeRow[]) =>
  api.defineAiTool({
    name: 'find_disputes_needing_action',
    description:
      'List open disputes that need a seller response, nearest deadline first, with the evidence PayPal ' +
      'requested from the seller that has not been provided. Read-only.',
    params: (s) =>
      s.object({
        maxDaysLeft: s.number({ description: 'Only disputes due within this many days (negative = overdue).' }).optional(),
        evidenceType: s.string({ description: 'Only disputes requesting this evidence type, e.g. PROOF_OF_FULFILLMENT.' }).optional(),
      }),
    execute: async ({ maxDaysLeft, evidenceType }, ctx) => {
      const matches = disputes
        .filter((d) => d.status !== 'Resolved' && d.daysToRespond !== null)
        .filter((d) => maxDaysLeft === undefined || d.daysToRespond! <= maxDaysLeft)
        .filter((d) => !evidenceType || d.evidenceRequested.split(', ').includes(evidenceType.toUpperCase()))
        .sort((a, b) => a.daysToRespond! - b.daysToRespond!)
        .map((d) => ({
          id: d.id,
          reason: d.reason,
          amount: d.amount,
          currency: d.currency,
          daysLeft: d.daysToRespond,
          sellerResponseDueDate: d.sellerResponseDueDate,
          evidenceRequested: d.evidenceRequested ? d.evidenceRequested.split(', ') : [],
          source: d.source,
        }));
      return ctx.success(`Found ${matches.length} dispute(s) needing action.`, { disputes: matches });
    },
  });

// `models` are the ids allowed by OPENAI_MODELS on the server; the first is the default, and the
// picker only shows for two or more.
export function buildAi(models: string[], disputes: DisputeRow[]): AgAiHarnessSetup {
  const adapter = openaiAdapter({ endpoint: '/api/ai', model: models[0] });

  return ({ api }) => {
    const findDisputes = findDisputesTool(api, disputes);
    return createAiHarness(api, ({ builtIn }) => ({
      // Studio's own agents unchanged, except the lead also gets our read-only tool.
      agents: Object.values(builtIn).map((definition) =>
        directLlmRunner({
          ...definition,
          adapter,
          ...(definition.id === 'lead' && {
            tools: (ctx, params) => [...(definition.tools?.(ctx, params) ?? []), findDisputes],
          }),
        }),
      ),
      primary: 'lead',
      promptStarters: PROMPT_STARTERS,
      models: models.length > 1 ? models.map((id) => ({ id, label: id })) : undefined,
    }));
  };
}
