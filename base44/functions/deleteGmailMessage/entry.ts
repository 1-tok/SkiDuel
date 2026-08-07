import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gmail_id, source_account } = await req.json().catch(() => ({}));
    if (!gmail_id) return Response.json({ error: 'gmail_id required' }, { status: 400 });

    let accessToken;
    if (source_account && source_account !== 'primary') {
      let match = null;
      try {
        const conns = await base44.asServiceRole.entities.AccountConnection.filter({ integration_type: 'gmail', is_active: true });
        match = conns.find(c => c.label === source_account || c.connector_id === source_account);
      } catch {}
      if (match) {
        ({ accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(match.connector_id));
      } else {
        ({ accessToken } = await base44.asServiceRole.connectors.getConnection('gmail'));
      }
    } else {
      ({ accessToken } = await base44.asServiceRole.connectors.getConnection('gmail'));
    }

    // Move the message to Trash (gmail.modify scope). It is auto-purged after 30 days.
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(gmail_id)}/trash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});