import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getGmailAccessToken } from '../../shared/gmailToken.ts';

// Decode base64url → UTF-8 string (atob alone mangles multibyte chars).
function decodeBase64(str) {
  if (!str) return '';
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

// Fetch the full body of a part. Gmail omits body.data (and returns an attachmentId)
// when the payload is too large — fetch it from the attachments endpoint in that case.
async function resolvePartBody(accessToken, gmailId, part) {
  if (!part || !part.body) return '';
  if (part.body.data) return decodeBase64(part.body.data);
  if (part.body.attachmentId) {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/attachments/${part.body.attachmentId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const att = await res.json();
        if (att?.data) return decodeBase64(att.data);
      }
    } catch {}
  }
  return '';
}

async function extractByType(accessToken, gmailId, payload, mime) {
  if (!payload) return '';
  if (payload.mimeType === mime && payload.body) return await resolvePartBody(accessToken, gmailId, payload);
  if (payload.parts) {
    for (const p of payload.parts) {
      if (p.mimeType === mime && p.body) return await resolvePartBody(accessToken, gmailId, p);
    }
    for (const p of payload.parts) {
      const nested = await extractByType(accessToken, gmailId, p, mime);
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

    const [html, text] = await Promise.all([
      extractByType(accessToken, gmail_id, payload, 'text/html'),
      extractByType(accessToken, gmail_id, payload, 'text/plain'),
    ]);

    return Response.json({
      html,
      text,
      attachments: extractAttachments(payload),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});