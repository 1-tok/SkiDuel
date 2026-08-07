import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text } = await req.json().catch(() => ({}));
    if (!text || !String(text).trim()) {
      return Response.json({ error: 'text required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    // Resolve the author URN (urn:li:person:<id>)
    const meRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      const details = await meRes.text();
      return Response.json({ error: 'Could not load LinkedIn profile', details }, { status: 502 });
    }
    const me = await meRes.json();
    const author = `urn:li:person:${me.id}`;

    const body = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: String(text) },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });
    if (!postRes.ok) {
      const details = await postRes.text();
      return Response.json({ error: 'LinkedIn post failed', details }, { status: postRes.status });
    }
    const result = await postRes.json();
    return Response.json({ success: true, id: result.id || result.activityUrn || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}