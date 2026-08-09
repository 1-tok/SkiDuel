import { Mail, CalendarDays, ListTodo, Columns, Hash, MessageCircle } from 'lucide-react';

// Paste the app-user connector ids here (from Settings → OAuth Connectors)
// to switch the onboarding connect flow to real per-user Google sign-in.
// Leave empty to keep using the shared connection that's already authorized.
export const GMAIL_CONNECTOR_ID = '';
export const GCAL_CONNECTOR_ID = '';

export const CONNECTABLE = [
  {
    key: 'gmail',
    label: 'Gmail',
    icon: Mail,
    accent: 'bg-primary/10 text-primary',
    body: 'Pull your inbox into one stream you can drag straight onto your day.',
    syncFn: 'syncGmail',
    connectorId: GMAIL_CONNECTOR_ID,
  },
  {
    key: 'googlecalendar',
    label: 'Google Calendar',
    icon: CalendarDays,
    accent: 'bg-accent/15 text-accent',
    body: 'See your real meetings so Calkanban can schedule around them — never double-booked.',
    syncFn: 'syncGoogleCalendar',
    connectorId: GCAL_CONNECTOR_ID,
  },
];

export const COMING_SOON = [
  { icon: ListTodo, name: 'ClickUp', desc: 'Tasks & docs' },
  { icon: Columns, name: 'Trello', desc: 'Boards & cards' },
  { icon: Hash, name: 'Slack', desc: 'Channel messages' },
  { icon: MessageCircle, name: 'WhatsApp', desc: 'Chat & replies' },
];