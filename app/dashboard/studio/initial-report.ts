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
          // Deadline, days and source first so they fit at 1440px; long text columns last.
          { id: 'disputes.id' },
          { id: 'disputes.sellerDeadlineLabel' },
          { id: 'disputes.daysToRespond' },
          { id: 'disputes.amountLabel' },
          { id: 'disputes.sourceLabel' },
          { id: 'disputes.status' },
          { id: 'disputes.reason' },
        ],
      },
      sort: [{ field: { id: 'disputes.daysToRespond' }, direction: 'asc' }],
      format: title('Dispute queue, nearest seller deadline first'),
    },
    // Custom widget from ./deadlines-widget.tsx; it reads Studio's context, so it maps no fields.
    'response-deadlines': {
      type: 'response-deadlines',
      format: title('Response deadlines'),
    } as unknown as NonNullable<AgPageState['widgets']>[string],
  },
  widgetLayout: {
    'response-deadlines': at(0, 0, 24, 14),
    'dispute-queue': at(0, 14, 24, 20),
  },
};

export const dashboardReport: AgReportState = {
  selectedPageId: queue.id,
  pages: [queue],
};
