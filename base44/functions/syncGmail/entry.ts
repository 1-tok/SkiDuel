import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function decodeBase64(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(normalized);
  } catch {
    return '';
  }
}

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

function extractPreview(message) {
  const payload = message.payload;
  if (!payload) return '';

  // Try snippet first
  if (message.snippet) return message.snippet.slice(0, 120);

  // Try body parts
  const tryPart = (part) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64(part.body.data).slice(0, 120);
    }
    return '';
  };

  if (payload.body?.data) return decodeBase64(payload.body.data).slice(0, 120);
  if (payload.parts) {
    for (const p of payload.parts) {
      const txt = tryPart(p);
      if (txt) return txt;
    }
  }
  return '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Fetch unread emails from INBOX
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&q=is:unread&maxResults=20',
      { headers: authHeader }
    );
    if (!listRes.ok) return Response.json({ error: 'Gmail API error' }, { status: 500 });

    const listData = await listRes.json();
    const messageIds = (listData.messages || []).map(m => m.id);

    // Fetch existing email gmail_ids to avoid duplicates
    const existingEmails = await base44.asServiceRole.entities.Email.list('-created_date', 100);
    const existingIds = new Set(existingEmails.map(e => e.gmail_id).filter(Boolean));

    const newEmails = [];
    for (const msgId of messageIds) {
      if (existingIds.has(msgId)) continue;

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: authHeader }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');

      // Parse sender name and email
      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/);
      const senderName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : from;
      const senderEmail = fromMatch ? fromMatch[2] : from;

      newEmails.push({
        sender: senderName || senderEmail,
        sender_email: senderEmail,
        subject: subject || '(No subject)',
        preview: msg.snippet ? msg.snippet.slice(0, 150) : '',
        timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
        is_read: false,
        is_actioned: false,
        gmail_id: msgId,
      });
    }

    if (newEmails.length > 0) {
      await base44.asServiceRole.entities.Email.bulkCreate(newEmails);
    }

    return Response.json({ synced: newEmails.length, total: messageIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});