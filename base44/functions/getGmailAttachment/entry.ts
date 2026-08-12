import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getGmailAccessToken } from '../../shared/gmailToken.ts';

async function fetchAttachment(accessToken, gmailId, attachmentId) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gmail_id, attachment_id, source_account, filename, mimeType } = await req.json().catch(() => ({}));
    if (!gmail_id || !attachment_id) return Response.json({ error: 'gmail_id and attachment_id required' }, { status: 400 });

    const accessToken = await getGmailAccessToken(base44, source_account);
    const att = await fetchAttachment(accessToken, gmail_id, attachment_id);
    if (!att) return Response.json({ error: 'Could not fetch attachment' }, { status: 502 });

    return Response.json({
      data: att.data,
      mimeType: att.mimeType || mimeType || 'application/octet-stream',
      filename: filename || 'attachment',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});