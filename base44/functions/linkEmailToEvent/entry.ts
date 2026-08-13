import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getGmailAccessToken } from '../../shared/gmailToken.ts';
import { serializeEventICS } from '../../shared/ics.ts';

// Pull the attachment list (filename, mime, size, attachmentId) for a Gmail
// message so the linked-email record carries its attachments.
async function fetchEmailAttachments(accessToken, gmailId) {
  if (!gmailId || !accessToken) return [];
  try {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const msg = await res.json();
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
    walk(msg.payload);
    return out;
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, email_id } = await req.json().catch(() => ({}));
    if (!event_id || !email_id) return Response.json({ error: 'event_id and email_id required' }, { status: 400 });

    const event = await base44.entities.CalendarEvent.get(event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (event.is_shared_calendar) return Response.json({ error: 'Cannot attach to a shared-calendar item' }, { status: 400 });

    const email = await base44.entities.Email.get(email_id);
    if (!email) return Response.json({ error: 'Email not found' }, { status: 404 });

    // Resolve the email's Gmail attachment references (if any).
    let attachments = [];
    if (email.gmail_id) {
      try {
        const token = await getGmailAccessToken(base44, email.source_account);
        attachments = await fetchEmailAttachments(token, email.gmail_id);
      } catch {}
    }

    const entry = {
      email_id: email.id,
      subject: email.subject,
      sender: email.sender,
      sender_email: email.sender_email,
      preview: email.preview,
      gmail_id: email.gmail_id,
      source_account: email.source_account,
      attachments,
    };

    // Append, replacing any existing link to the same email.
    const linked = (Array.isArray(event.linked_emails) ? event.linked_emails : []).filter(l => l.email_id !== email.id);
    linked.push(entry);

    const updates = { linked_emails: linked };
    if (!event.source_email_id) updates.source_email_id = email.id;

    const updated = await base44.entities.CalendarEvent.update(event_id, updates);

    // Mark the email actioned so it leaves the Communications inbox.
    try { await base44.entities.Email.update(email_id, { is_actioned: true, is_read: true }); } catch {}

    // Internal canonical ICS carrying kanban column, priority, and the
    // included emails (with attachment references).
    const ics = serializeEventICS({ ...updated, linked_emails: linked });

    return Response.json({ event: updated, ics });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});