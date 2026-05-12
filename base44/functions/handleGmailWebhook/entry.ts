import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const messageIds = body.data?.new_message_ids ?? [];
    if (messageIds.length === 0) return Response.json({ status: 'no_new_messages' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get existing gmail_ids to avoid duplicates
    const existingEmails = await base44.asServiceRole.entities.Email.list('-created_date', 200);
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

      // Skip if not in INBOX or is sent mail
      const labels = msg.labelIds || [];
      if (!labels.includes('INBOX')) continue;

      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');

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

    return Response.json({ processed: messageIds.length, created: newEmails.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});