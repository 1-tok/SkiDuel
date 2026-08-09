import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { GMAIL_CONNECTOR_ID } from '../../shared/integrationConfig.ts';

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

async function syncOneGmailAccount(base44, accessToken) {
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Identify the source Gmail account
  let sourceAccount = '';
  try {
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: authHeader });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      sourceAccount = profile.emailAddress || '';
    }
  } catch {}

  // Fetch unread emails from INBOX
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&q=is:unread&maxResults=20',
    { headers: authHeader }
  );
  if (!listRes.ok) return { account: sourceAccount, synced: 0, error: 'Gmail API error' };

  const listData = await listRes.json();
  const messageIds = (listData.messages || []).map(m => m.id);

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
      source_account: sourceAccount,
    });
  }

  if (newEmails.length > 0) {
    await base44.asServiceRole.entities.Email.bulkCreate(newEmails);
  }

  return { account: sourceAccount, synced: newEmails.length, total: messageIds.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = [];

    // Per-user (app-user) connection: when a workspace connector id is configured,
    // sync the signed-in user's own Gmail only and skip the shared builder account.
    if (GMAIL_CONNECTOR_ID) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
        results.push(await syncOneGmailAccount(base44, accessToken));
      } catch (e) {
        results.push({ account: 'app_user', error: e.message });
      }
      return Response.json({ results });
    }

    // Primary shared connection
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
      results.push(await syncOneGmailAccount(base44, accessToken));
    } catch (e) {
      results.push({ account: 'primary', error: e.message });
    }

    // Additional BYO-shared workspace connectors
    let accountConfigs = [];
    try {
      accountConfigs = await base44.asServiceRole.entities.AccountConnection.filter({ integration_type: 'gmail', is_active: true });
    } catch {}

    for (const ac of accountConfigs) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(ac.connector_id);
        results.push(await syncOneGmailAccount(base44, accessToken));
      } catch (e) {
        results.push({ account: ac.label || ac.connector_id, error: e.message });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});