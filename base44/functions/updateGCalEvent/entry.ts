import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gcal_event_id, start_time, end_time } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const patch = {
      start: { dateTime: start_time, timeZone: 'UTC' },
      end: { dateTime: end_time, timeZone: 'UTC' },
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gcal_event_id)}?supportsAttachments=true`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    const updated = await res.json();
    return Response.json({ gcal_event_id: updated.id, htmlLink: updated.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});