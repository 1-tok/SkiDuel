import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format } from 'npm:date-fns@3.6.0';

function mapGCalEvent(gcEvent, calendarName, isShared, sourceAccount) {
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
    calendar_name: calendarName,
    is_shared_calendar: !!isShared,
    source_account: sourceAccount || '',
    kanban_column: status === 'cancelled' ? 'past' : isToday ? 'doing' : 'todo',
    color: colorMap[gcEvent.colorId] || 'blue',
    gcal_event_id: gcEvent.id,
  };
}

async function fetchAllPages(url, authHeader) {
  const items = [];
  let nextSyncToken = null;
  let pageData;

  let res = await fetch(url, { headers: authHeader });
  if (!res.ok) return { items, nextSyncToken };
  pageData = await res.json();

  while (true) {
    items.push(...(pageData.items || []));
    if (pageData.nextSyncToken) nextSyncToken = pageData.nextSyncToken;
    if (!pageData.nextPageToken) break;
    const nextRes = await fetch(`${url}&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
    if (!nextRes.ok) break;
    pageData = await nextRes.json();
  }

  return { items, nextSyncToken };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Fetch all calendars
    const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers: authHeader });
    if (!calListRes.ok) return Response.json({ error: 'Failed to list calendars' }, { status: 500 });
    const calListData = await calListRes.json();
    const calendars = (calListData.items || []).filter(c => c.selected !== false);
    const accountEmail = (calendars.find(c => c.primary) || {}).id || (calendars[0] || {}).id || '';

    // Ensure a visibility record exists for each calendar (default visible)
    const existingVis = await base44.asServiceRole.entities.CalendarVisibility.list('-created_date', 200);
    const visByKey = {};
    for (const v of existingVis) visByKey[`${v.source_account}|${v.calendar_name}`] = v;
    for (const cal of calendars) {
      const calName = cal.summary || cal.id;
      const key = `${accountEmail}|${calName}`;
      if (!visByKey[key]) {
        await base44.asServiceRole.entities.CalendarVisibility.create({
          source_account: accountEmail,
          calendar_name: calName,
          is_visible: true,
          is_shared: cal.accessRole && cal.accessRole !== 'owner',
        });
        visByKey[key] = true;
      }
    }

    // Get existing gcal events
    const existingEvents = await base44.asServiceRole.entities.CalendarEvent.filter({ source: 'google_calendar' });
    const existingByGCalId = {};
    for (const e of existingEvents) {
      if (e.gcal_event_id) existingByGCalId[e.gcal_event_id] = e;
    }

    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    let created = 0, updated = 0;

    for (const cal of calendars) {
      const calId = encodeURIComponent(cal.id);
      const calName = cal.summary || cal.id;

      // Load per-calendar sync token
      const syncKey = `googlecalendar_${cal.id}`;
      const syncStates = await base44.asServiceRole.entities.SyncState.filter({ service: syncKey });
      const syncRecord = syncStates.length > 0 ? syncStates[0] : null;

      let url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?maxResults=100&singleEvents=true&orderBy=startTime`;
      if (syncRecord?.sync_token) {
        url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?maxResults=100&syncToken=${syncRecord.sync_token}`;
      } else {
        url += `&timeMin=${timeMin}&timeMax=${timeMax}`;
      }

      let { items, nextSyncToken } = await fetchAllPages(url, authHeader);

      // syncToken expired — full resync
      if (items.length === 0 && syncRecord?.sync_token) {
        url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?maxResults=100&singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}`;
        const result = await fetchAllPages(url, authHeader);
        items = result.items;
        nextSyncToken = result.nextSyncToken;
      }

      const isShared = cal.accessRole && cal.accessRole !== 'owner';

    for (const gcEvent of items) {
        const mapped = mapGCalEvent(gcEvent, calName, isShared, accountEmail);
        if (!mapped) continue;

        const existing = existingByGCalId[gcEvent.id];
        if (existing) {
          await base44.asServiceRole.entities.CalendarEvent.update(existing.id, mapped);
          updated++;
        } else {
          await base44.asServiceRole.entities.CalendarEvent.create(mapped);
          created++;
        }
      }

      // Save per-calendar sync token
      if (nextSyncToken) {
        const now = new Date().toISOString();
        if (syncRecord) {
          await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: nextSyncToken, last_synced: now });
        } else {
          await base44.asServiceRole.entities.SyncState.create({ service: syncKey, sync_token: nextSyncToken, last_synced: now });
        }
      }
    }

    return Response.json({ created, updated, calendars: calendars.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});