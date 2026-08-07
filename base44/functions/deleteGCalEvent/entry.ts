import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gcal_event_id, calendar_id, source_account } = await req.json().catch(() => ({}));
    if (!gcal_event_id) return Response.json({ error: 'gcal_event_id required' }, { status: 400 });

    let accessToken;
    if (source_account && source_account !== 'primary') {
      let match = null;
      try {
        const conns = await base44.asServiceRole.entities.AccountConnection.filter({ integration_type: 'googlecalendar', is_active: true });
        match = conns.find(c => c.label === source_account || c.connector_id === source_account);
      } catch {}
      if (match) {
        ({ accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(match.connector_id));
      } else {
        ({ accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar'));
      }
    } else {
      ({ accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar'));
    }

    const calId = encodeURIComponent(calendar_id || 'primary');
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${encodeURIComponent(gcal_event_id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 410 Gone / 404 mean the event no longer exists on Google — treat as success.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});