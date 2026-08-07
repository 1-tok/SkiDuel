import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function decodeBase64(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(normalized);
  } catch {
    return '';
  }
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === 'text/plain' && p.body && p.body.data) return decodeBase64(p.body.data);
    }
    for (const p of payload.parts) {
      if (p.mimeType === 'text/html' && p.body && p.body.data) return decodeBase64(p.body.data);
    }
    for (const p of payload.parts) {
      const nested = extractBody(p);
      if (nested) return nested;
    }
  }
  return '';
}

async function fetchBody(accessToken, gmailId) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return '';
  const msg = await res.json();
  return extractBody(msg.payload) || msg.snippet || '';
}

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

    const body = await fetchBody(accessToken, gmail_id);
    return Response.json({ body });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});