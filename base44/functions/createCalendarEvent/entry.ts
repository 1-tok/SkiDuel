import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, start_time, end_time, attachments } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const gcEvent = {
      summary: title,
      description: description || '',
      start: { dateTime: start_time, timeZone: 'UTC' },
      end: { dateTime: end_time, timeZone: 'UTC' },
      ...(hasAttachments ? { attachments: attachments.map(a => ({ fileUrl: a.file_url, title: a.title })) } : {}),
    };

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events${hasAttachments ? '?supportsAttachments=true' : ''}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gcEvent),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    const created = await res.json();
    return Response.json({ gcal_event_id: created.id, htmlLink: created.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});