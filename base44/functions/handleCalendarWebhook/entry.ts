import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

function mapGCalEvent(gcEvent) {
  const start = gcEvent.start?.dateTime || gcEvent.start?.date;
  const end = gcEvent.end?.dateTime || gcEvent.end?.date;
  if (!start || !end) return null;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMinutes = Math.round((endDate - startDate) / 60000);

  const colorMap = {
    '1': 'blue', '2': 'green', '3': 'purple', '4': 'pink',
    '5': 'orange', '6': 'orange', '7': 'blue', '8': 'green',
    '9': 'purple', '10': 'green', '11': 'pink',
  };

  const status = gcEvent.status === 'cancelled' ? 'cancelled' : 'scheduled';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = startDate >= today && startDate < new Date(today.getTime() + 86400000);

  return {
    title: gcEvent.summary || '(No title)',
    description: gcEvent.description || '',
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    date: format(startDate, 'yyyy-MM-dd'),
    duration_minutes: durationMinutes,
    status,
    source: 'google_calendar',
    _isToday: isToday,
    color: colorMap[gcEvent.colorId] || 'blue',
    gcal_event_id: gcEvent.id,
  };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const state = body.data?._provider_meta?.['x-goog-resource-state'];
    if (state === 'sync') return Response.json({ status: 'sync_ack' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load sync token
    const syncStates = await base44.asServiceRole.entities.SyncState.filter({ service: 'googlecalendar' });
    const syncRecord = syncStates.length > 0 ? syncStates[0] : null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${syncRecord.sync_token}`;
    } else {
      url += '&timeMin=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    let res = await fetch(url, { headers: authHeader });
    if (res.status === 410) {
      url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&timeMin=' 
        + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      res = await fetch(url, { headers: authHeader });
    }
    if (!res.ok) return Response.json({ status: 'api_error' });

    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = null;

    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      const nextRes = await fetch(`${url}&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    // Match existing events by gcal_event_id (any source) and clean up duplicates
    const existingEvents = await base44.asServiceRole.entities.CalendarEvent.list('-created_date', 500);
    const existingByGCalId = {};
    for (const e of existingEvents) {
      if (!e.gcal_event_id) continue;
      if (existingByGCalId[e.gcal_event_id]) {
        try { await base44.asServiceRole.entities.CalendarEvent.delete(e.id); } catch {}
      } else {
        existingByGCalId[e.gcal_event_id] = e;
      }
    }

    for (const gcEvent of allItems) {
      const mapped = mapGCalEvent(gcEvent);
      if (!mapped) continue;
      const { _isToday, ...fields } = mapped;
      const kanbanForNew = mapped.status === 'cancelled' ? 'past' : _isToday ? 'doing' : 'todo';
      const existing = existingByGCalId[gcEvent.id];
      if (existing) {
        const update = { ...fields };
        // Preserve the user's terminal kanban placements; otherwise re-derive by day
        if (existing.kanban_column !== 'done' && existing.kanban_column !== 'past') {
          update.kanban_column = kanbanForNew;
        }
        await base44.asServiceRole.entities.CalendarEvent.update(existing.id, update);
      } else {
        await base44.asServiceRole.entities.CalendarEvent.create({ ...fields, kanban_column: kanbanForNew });
      }
    }

    if (newSyncToken) {
      const now = new Date().toISOString();
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: newSyncToken, last_synced: now });
      } else {
        await base44.asServiceRole.entities.SyncState.create({ service: 'googlecalendar', sync_token: newSyncToken, last_synced: now });
      }
    }

    return Response.json({ processed: allItems.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});