// AG Studio's data sources for the dashboard: the dispute queue from lib/dashboard-data.ts.

import type { AgDataSourcesDefinition, AgFieldDefinition, AgFormat } from 'ag-studio';
import type { DashboardData } from '@/lib/dashboard-data';

// [id, name, format, hide?]
type FieldSpec = [id: string, name: string, format: AgFormat, hide?: boolean];

const fields = (specs: FieldSpec[]): AgFieldDefinition[] =>
  specs.map(([id, name, format, hide]) => ({ id, name, format, ...(hide && { hide }) }));

// Whether there is anything to report on. Without it, Studio would only show empty widgets.
export const hasData = (data: DashboardData) => data.disputes.length > 0;

export function buildStudioData(data: DashboardData): AgDataSourcesDefinition {
  return {
    description:
      'PayPal sandbox disputes fetched over the REST API for one merchant. Amounts are the disputed amount, ' +
      'not what PayPal held, and are not converted between currencies.',
    sources: [
      {
        id: 'disputes',
        description: 'One row per dispute. Days to respond is negative once the seller deadline has passed.',
        data: data.disputes,
        fields: fields([
          ['id', 'Dispute ID', 'textFormat'],
          ['source', 'Source Mode', 'textFormat', true],
          ['reason', 'Reason', 'textFormat'],
          ['status', 'Status', 'textFormat'],
          ['stage', 'Stage', 'textFormat'],
          ['channel', 'Channel', 'textFormat'],
          ['currency', 'Currency', 'textFormat'],
          ['amount', 'Disputed Amount', 'currencyFormat'],
          ['createdAt', 'Opened', 'dateTimeFormat'],
          ['updatedAt', 'Updated', 'dateTimeFormat'],
          ['sellerResponseDueDate', 'Seller Deadline', 'dateTimeFormat'],
          ['sellerDeadlineLabel', 'Deadline (UTC)', 'textFormat'],
          ['sourceLabel', 'Source', 'textFormat'],
          ['amountLabel', 'Amount', 'textFormat'],
          ['daysToRespond', 'Days to Respond', 'integerFormat'],
          ['urgency', 'Urgency', 'textFormat'],
          ['evidenceRequested', 'Evidence Requested', 'textFormat'],
          ['evidenceRequestedCount', 'Evidence Requested Count', 'integerFormat'],
          ['heldCurrency', 'Held Currency', 'textFormat'],
          ['heldAmount', 'Held Amount', 'currencyFormat'],
        ]),
      },
    ],
  };
}
