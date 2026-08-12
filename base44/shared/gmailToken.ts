// Resolves a Gmail access token for the shared connector, or a specific
// workspace-connected account when source_account is provided.
export async function getGmailAccessToken(base44, source_account) {
  if (source_account && source_account !== 'primary') {
    let match = null;
    try {
      const conns = await base44.asServiceRole.entities.AccountConnection.filter({ integration_type: 'gmail', is_active: true });
      match = conns.find(c => c.label === source_account || c.connector_id === source_account);
    } catch {}
    if (match) {
      const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(match.connector_id);
      return accessToken;
    }
  }
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
  return accessToken;
}