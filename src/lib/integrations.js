const LOGO = (slug) => `https://cdn.simpleicons.org/${slug}`;

// Paste the app-user connector ids here (from Settings → OAuth Connectors)
// to switch the onboarding connect flow to real per-user Google sign-in.
// Leave empty to keep using the shared connection that's already authorized.
export const GMAIL_CONNECTOR_ID = '';
export const GCAL_CONNECTOR_ID = '';

export const CONNECTABLE = [
  {
    key: 'gmail',
    label: 'Gmail',
    logo: LOGO('gmail'),
    body: 'Pull your inbox into one stream you can drag straight onto your day.',
    syncFn: 'syncGmail',
    connectorId: GMAIL_CONNECTOR_ID,
  },
  {
    key: 'googlecalendar',
    label: 'Google Calendar',
    logo: LOGO('googlecalendar'),
    body: 'See your real meetings so Skiduel can schedule around them — never double-booked.',
    syncFn: 'syncGoogleCalendar',
    connectorId: GCAL_CONNECTOR_ID,
  },
];

export const COMING_SOON = [
  { logo: LOGO('clickup'), name: 'ClickUp', desc: 'Tasks & docs' },
  { logo: LOGO('trello'), name: 'Trello', desc: 'Boards & cards' },
  { logo: LOGO('slack'), name: 'Slack', desc: 'Channel messages' },
  { logo: LOGO('whatsapp'), name: 'WhatsApp', desc: 'Chat & replies' },
];