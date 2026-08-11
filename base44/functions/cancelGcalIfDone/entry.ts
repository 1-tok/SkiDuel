import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Entity-automation payload: { event, data, old_data, changed_fields }. When invoked
    // directly for testing, the caller may pass the event fields at the top level.
    const body = await req.json().catch(() => ({}));
    const data = body.data || body;
    if (!data) return Response.json({ skipped: true, reason: 'no data' });

    const doneOrPast = data.kanban_column === 'done' || data.kanban_column === 'past'
      || data.status === 'completed' || data.status === 'cancelled';
    if (!doneOrPast) return Response.json({ skipped: true, reason: 'not done/past' });

    if (!data.gcal_event_id) return Response.json({ skipped: true, reason: 'no gcal event' });
    if (data.is_shared_calendar) return Response.json({ skipped: true, reason: 'shared calendar' });

    const endTime = data.end_time ? new Date(data.end_time) : null;
    if (!endTime || endTime <= new Date()) return Response.json({ skipped: true, reason: 'not in future' });

    // Cancel (delete) the Google Calendar event so it shows as cancelled / is removed.
    await base44.functions.invoke('deleteGCalEvent', {
      gcal_event_id: data.gcal_event_id,
      source_account: data.source_account,
    });
    return Response.json({ cancelled: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}