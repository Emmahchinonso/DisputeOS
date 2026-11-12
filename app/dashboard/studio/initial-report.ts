// The built-in "Dispute queue" report, as AG Studio report state. Field ids ('disputes.amount')
// refer to the data sources in ./data.ts.

import type { AgPageState, AgReportState, AgWidgetLayoutState } from 'ag-studio';

// Position on the canvas grid, in tracks: 24 columns wide, rows of studioCanvasRowHeight.
const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({
  xTrack,
  yTrack,
  xSpan,
  ySpan,
});
const title = (text: string) => ({ title: { enabled: true, text } });

// TODO: KPI tiles and the custom case widgets get their own brief.
const queue: AgPageState = {
  id: 'queue',
  widgets: {
    'dispute-queue': {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'disputes.id' },
          { id: 'disputes.reason' },
          { id: 'disputes.stage' },
          { id: 'disputes.status' },
          { id: 'disputes.currency' },
          { id: 'disputes.amount', aggregation: 'sum' },
          { id: 'disputes.sellerResponseDueDate' },
          { id: 'disputes.daysToRespond' },
          { id: 'disputes.createdAt' },
        ],
      },
      sort: [{ field: { id: 'disputes.daysToRespond' }, direction: 'asc' }],
      format: title('Dispute queue, nearest seller deadline first'),
    },
  },
  widgetLayout: {
    'dispute-queue': at(0, 0, 24, 24),
  },
};

export const dashboardReport: AgReportState = {
  selectedPageId: queue.id,
  pages: [queue],
};
