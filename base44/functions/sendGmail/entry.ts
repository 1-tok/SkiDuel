import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function encodeBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

async function getAccessToken(base44, source_account) {
  if (source_account && source_account !== 'primary') {
    let match = null;
    try {
      const conns = await base44.asServiceRole.entities.AccountConnection.filter({ integration_type: 'gmail', is_active: true });
      match = conns.find(c => c.label === source_account || c.connector_id === source_account);
    } catch {}
    if (match) {
      return (await base44.asServiceRole.connectors.getWorkspaceConnection(match.connector_id)).accessToken;
    }
  }
  return (await base44.asServiceRole.connectors.getConnection('gmail')).accessToken;
}

function splitAddresses(val) {
  return (val || '').split(',').map(s => s.trim()).filter(Boolean);
}

function buildRaw({ to, subject, body, inReplyTo, references }) {
  const lines = [];
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('MIME-Version: 1.0');
  lines.push('');
  lines.push(body || '');
  return encodeBase64Url(lines.join('\r\n'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { gmail_id, source_account, action, body, to } = await req.json().catch(() => ({}));
    if (!gmail_id || !action) return Response.json({ error: 'gmail_id and action required' }, { status: 400 });

    const accessToken = await getAccessToken(base44, source_account);

    const metaRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmail_id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Message-Id&metadataHeaders=References`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) return Response.json({ error: 'Could not load original message' }, { status: 502 });
    const meta = await metaRes.json();
    const headers = meta.payload?.headers || [];
    const from = getHeader(headers, 'From');
    const toHdr = getHeader(headers, 'To');
    let subject = getHeader(headers, 'Subject') || '';
    const messageId = getHeader(headers, 'Message-Id');
    const referencesHdr = getHeader(headers, 'References');
    const threadId = meta.threadId;

    let recipients = '';
    const refs = [referencesHdr, messageId].filter(Boolean).join(' ');

    if (action === 'reply') {
      recipients = from;
      subject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    } else if (action === 'replyall') {
      const self = (source_account || '').toLowerCase();
      const all = [
        ...splitAddresses(from),
        ...splitAddresses(toHdr).filter(a => !a.toLowerCase().includes(self)),
      ];
      recipients = [...new Set(all)].join(', ');
      subject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    } else if (action === 'forward') {
      recipients = to || '';
      subject = subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`;
    } else {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    const raw = buildRaw({
      to: recipients,
      subject,
      body: body || '',
      inReplyTo: action === 'forward' ? undefined : messageId,
      references: action === 'forward' ? undefined : refs,
    });

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, threadId }),
    });
    if (!sendRes.ok) {
      const err = await sendRes.text();
      return Response.json({ error: 'Gmail send failed', details: err }, { status: sendRes.status });
    }
    const sent = await sendRes.json();
    return Response.json({ success: true, id: sent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});