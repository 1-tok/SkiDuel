import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getGmailAccessToken } from '../../shared/gmailToken.ts';

function decodeBase64(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  try { return atob(normalized); } catch { return ''; }
}

function extractByType(payload, mime) {
  if (!payload) return '';
  if (payload.mimeType === mime && payload.body && payload.body.data) return decodeBase64(payload.body.data);
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === mime && p.body && p.body.data) return decodeBase64(p.body.data);
    }
    for (const p of payload.parts) {
      const nested = extractByType(p, mime);
      if (nested) return nested;
    }
  }
  return '';
}

function extractAttachments(payload) {
  const out = [];
  const walk = (p) => {
    if (!p) return;
    if (p.filename && p.body && p.body.attachmentId) {
      out.push({
        filename: p.filename,
        mimeType: p.mimeType || 'application/octet-stream',
        size: p.body.size || 0,
        attachmentId: p.body.attachmentId,
      });
    }
    if (p.parts) p.parts.forEach(walk);
  };
  walk(payload);
  return out;
}

async function fetchPayload(accessToken, gmailId) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const msg = await res.json();
  return msg.payload;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gmail_id, source_account } = await req.json().catch(() => ({}));
    if (!gmail_id) return Response.json({ error: 'gmail_id required' }, { status: 400 });

    const accessToken = await getGmailAccessToken(base44, source_account);
    const payload = await fetchPayload(accessToken, gmail_id);
    if (!payload) return Response.json({ error: 'Could not fetch message' }, { status: 502 });

    return Response.json({
      html: extractByType(payload, 'text/html'),
      text: extractByType(payload, 'text/plain'),
      attachments: extractAttachments(payload),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});