import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { format, parseISO, isSameDay, isBefore, startOfWeek, addDays } from 'date-fns';
import { findNextAvailableSlot, computeSqueeze, isFlexibleEvent } from '@/lib/scheduling';
import { RefreshCw, CalendarDays, List, Plus, Bell, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import GmailSidebar from '@/components/gmail/GmailSidebar';
import EmailModal from '@/components/gmail/EmailModal';
import AddItemModal from '@/components/AddItemModal';
import CalendarPanel from '@/components/calendar/CalendarPanel';
import KanbanPanel from '@/components/kanban/KanbanPanel';
import ScheduleView from '@/components/schedule/ScheduleView';
import FollowUpModal from '@/components/FollowUpModal';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import AccountMenu from '@/components/AccountMenu';
import SyncIntegrationsModal from '@/components/gmail/SyncIntegrationsModal';
import ThemeToggle from '@/components/ThemeToggle';
import InsightsPanel from '@/components/insights/InsightsPanel';
import SearchBar from '@/components/SearchBar';
import EventModal from '@/components/kanban/EventModal';
import LinkedInComposer from '@/components/LinkedInComposer';
import SlackSettings from '@/components/slack/SlackSettings';
import WeeklyTrendChart from '@/components/insights/WeeklyTrendChart';
import Onboarding from '@/components/onboarding/Onboarding';

const HOUR_HEIGHT = 60;
function slotFromDropY(droppableId, clientY, durationMin) {
  const el = document.querySelector(`[data-rbd-droppable-id="${droppableId}"]`);
  if (!el || clientY == null) return null;
  const rect = el.getBoundingClientRect();
  // Month-view day cells are short (no 24h axis) — can't map Y to a time slot.
  if (rect.height < 24 * HOUR_HEIGHT * 0.5) return null;
  // getBoundingClientRect() is viewport-relative (already scroll-adjusted), so clientY - rect.top
  // is the correct position within the 24h column — do NOT add scrollTop (double-counts → 23:00).
  const relY = clientY - rect.top;
  let minutes = Math.max(0, Math.min(23 * 60, Math.round((relY / HOUR_HEIGHT) * 60)));
  minutes = Math.round(minutes / 15) * 15;
  const targetDate = droppableId.replace('calendar-', '');
  const start = new Date(targetDate + 'T00:00:00');
  start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60000);
  return { start_time: start.toISOString(), end_time: end.toISOString(), date: targetDate };
}

// Maps a schedule-list drop (viewport Y) to a desired start time: the end time of the
// item just above the drop point, so the new item inserts between the two cards rather
// than jumping to the next free slot.
function startFromScheduleDrop(events, clientY) {
  const cards = Array.from(document.querySelectorAll('[data-schedule-item]'));
  if (!cards.length || clientY == null) return null;
  let idx = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) { idx = i; break; }
  }
  const now = new Date();
  const upcoming = events
    .filter(e => e && e.start_time)
    .filter(e => { const d = parseISO(e.start_time); return isSameDay(d, now) || d >= now; })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const preceding = idx > 0 ? upcoming[idx - 1] : null;
  const following = upcoming[idx] || null;
  if (preceding) {
    let start = new Date(preceding.end_time || preceding.start_time);
    if (start < now) start = now;
    return start;
  }
  if (following) {
    const fStart = new Date(following.start_time);
    return now < fStart ? now : new Date(fStart.getTime() - 10 * 60000);
  }
  return now;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [followUpEvent, setFollowUpEvent] = useState(null);
  const [onboarded, setOnboarded] = useState(null);
  const [celebration, setCelebration] = useState({ open: false, stats: null });
  const [ghosts, setGhosts] = useState([]);
  const [openEmail, setOpenEmail] = useState(null);
  const [openEmailEventId, setOpenEmailEventId] = useState(null);
  const [addState, setAddState] = useState(null);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [slackOpen, setSlackOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchEvent, setSearchEvent] = useState(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState(new Set());
  const [selectedEventIds, setSelectedEventIds] = useState(new Set());
  const [view, setView] = useState('schedule'); // 'calendar' | 'board'
  const [screen, setScreen] = useState('app'); // 'app' | 'insights'
  const followUpTimersRef = useRef({});
  const dragPosRef = useRef({ y: 0 });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const onMove = (e) => { if (e.clientY != null) dragPosRef.current.y = e.clientY; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  // After a drag-and-drop, a click event fires on the drop target. Calendar/schedule/kanban
  // droppables treat a click as "add item" — suppress that post-drop click so dropping an
  // item back to its original slot doesn't open the Add modal.
  useEffect(() => {
    const onClickCapture = (e) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const onPointerDown = () => { suppressClickRef.current = false; };
    window.addEventListener('click', onClickCapture, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  // Initial sync on mount
  useEffect(() => {
    handleSync();
  }, []);

  // Show the onboarding sequence for users who haven't completed it yet.
  useEffect(() => {
    base44.auth.me().then(u => setOnboarded(!!u?.onboarded)).catch(() => setOnboarded(true));
  }, []);

  // Request browser notification permission on entering the app
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) { toast.error('Notifications not supported in this browser'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      toast.success('Notifications enabled');
      try { new Notification('Calkanban', { body: 'Browser notifications are on.' }); } catch {}
    } else {
      toast.message('Notifications not enabled');
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await Promise.all([
        base44.functions.invoke('syncGmail', {}),
        base44.functions.invoke('syncGoogleCalendar', {}),
      ]);
      await queryClient.invalidateQueries();
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Fetch data
  const { data: emails = [] } = useQuery({
    queryKey: ['emails'],
    queryFn: () => base44.entities.Email.list('-created_date', 50),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_time', 200),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.UserSettings.list('-created_date', 1),
  });
  const settings = settingsList[0] || {};

  const { data: visibility = [] } = useQuery({
    queryKey: ['calendarVisibility'],
    queryFn: () => base44.entities.CalendarVisibility.list('-created_date', 200),
  });

  // Filter out events from hidden calendars (manual/gmail always shown)
  const visibleEvents = useMemo(() => {
    const hidden = new Set(
      visibility.filter(v => !v.is_visible).map(v => `${v.source_account || ''}|${v.calendar_name}`)
    );
    return events.filter(e => {
      if (e.source !== 'google_calendar' || !e.calendar_name) return true;
      return !hidden.has(`${e.source_account || ''}|${e.calendar_name}`);
    });
  }, [events, visibility]);

  // Items moved to the Past record are hidden from the active Calendar/Schedule views,
  // but still surface in the Kanban "Past" column.
  const activeEvents = useMemo(
    () => visibleEvents.filter(e => e.kanban_column !== 'past' && e.status !== 'cancelled'),
    [visibleEvents]
  );

  const mailAccounts = useMemo(
    () => [...new Set(emails.map(e => e.source_account).filter(Boolean))],
    [emails]
  );
  const calendarAccounts = useMemo(
    () => [...new Set(events.filter(e => e.source === 'google_calendar').map(e => e.source_account).filter(Boolean))],
    [events]
  );

  // Mutations
  const updateEmail = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Email.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      // When an email leaves Communications (actioned or read), mirror that to Gmail so
      // the email client shows it as read too. Read from cache to avoid a stale closure.
      if (variables.data?.is_actioned || variables.data?.is_read) {
        const cached = queryClient.getQueryData(['emails']) || [];
        const email = cached.find(e => e.id === variables.id);
        if (email?.gmail_id) {
          base44.functions.invoke('markGmailRead', { gmail_id: email.gmail_id, source_account: email.source_account }).catch(() => {});
        }
      }
    },
  });

  const createEvent = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  // Follow-up timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      events
        .filter(e => e.status === 'scheduled')
        .forEach(event => {
          const endTime = parseISO(event.end_time);
          if (isBefore(endTime, now) && !followUpTimersRef.current[event.id]) {
            followUpTimersRef.current[event.id] = true;
            setFollowUpEvent(event);
          }
        });
    }, 30000);
    return () => clearInterval(interval);
  }, [events]);

  const handleMarkRead = useCallback((email) => {
    updateEmail.mutate({ id: email.id, data: { is_read: true, is_actioned: true } });
  }, [updateEmail]);

  const handleDeleteEmail = useCallback(async (email) => {
    // Soft-delete: archive the email as a Past record (retain it, don't trash in Gmail).
    // Routes through updateEmail so the message is also marked read in Gmail.
    try {
      await updateEmail.mutateAsync({ id: email.id, data: { is_actioned: true, is_read: true } });
      toast.success('Moved to Past');
    } catch (e) {
      toast.error('Could not move to Past: ' + (e?.message || e));
    }
  }, [updateEmail]);

  const handleSnoozeEmail = useCallback((email) => {
    updateEmail.mutate({ id: email.id, data: { is_read: true } });
    toast.message('Snoozed');
  }, [updateEmail]);

  const handleDeleteEvent = useCallback(async (event) => {
    // Soft-delete: move the item into the Past record instead of permanently removing it.
    try {
      await base44.entities.CalendarEvent.update(event.id, { kanban_column: 'past', status: 'cancelled' });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Moved to Past');
    } catch (e) {
      toast.error('Could not move to Past: ' + (e?.message || e));
    }
  }, [queryClient]);

  const handleUpdateEvent = useCallback(async (event, updates) => {
    try {
      await updateEvent.mutateAsync({ id: event.id, data: updates });
      const hasAttachments = updates.attachments !== undefined;
      if (event.gcal_event_id && (updates.title || updates.description || updates.start_time || updates.end_time || hasAttachments)) {
        try {
          await base44.functions.invoke('updateGCalEvent', {
            gcal_event_id: event.gcal_event_id,
            title: updates.title ?? event.title,
            description: updates.description ?? event.description ?? '',
            start_time: updates.start_time ?? event.start_time,
            end_time: updates.end_time ?? event.end_time,
            ...(hasAttachments ? { attachments: updates.attachments } : {}),
          });
        } catch (e) {
          toast.error('Google Calendar sync failed: ' + (e?.message || e));
        }
      } else if (!event.gcal_event_id && !event.is_shared_calendar && hasAttachments && (updates.attachments || []).length > 0) {
        // Item isn't in Google Calendar yet — create the associated GCal event so the
        // attachments are mirrored and ready for the meeting.
        try {
          const res = await base44.functions.invoke('createCalendarEvent', {
            title: updates.title ?? event.title,
            description: updates.description ?? event.description ?? '',
            start_time: updates.start_time ?? event.start_time,
            end_time: updates.end_time ?? event.end_time,
            attachments: updates.attachments,
          });
          if (res?.gcal_event_id) {
            await base44.entities.CalendarEvent.update(event.id, {
              gcal_event_id: res.gcal_event_id,
              source: 'google_calendar',
              calendar_name: 'primary',
            });
            try {
              const dups = await base44.entities.CalendarEvent.filter({ gcal_event_id: res.gcal_event_id });
              await Promise.all(dups.filter(d => d.id !== event.id).map(d => base44.entities.CalendarEvent.delete(d.id)));
            } catch {}
            queryClient.invalidateQueries({ queryKey: ['events'] });
          }
        } catch (e) {
          toast.error('Could not add to Google Calendar: ' + (e?.message || e));
        }
      }
    } catch (e) {
      toast.error('Update failed: ' + (e?.message || e));
    }
  }, [updateEvent, queryClient]);

  const handleScheduleEmail = useCallback((email) => {
    const today = new Date();
    const slot = findNextAvailableSlot(events, today, settings);
    if (!slot) return;
    createEvent.mutate({
      title: email.subject,
      description: `From: ${email.sender}\n${email.preview}`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      date: slot.date,
      duration_minutes: settings.default_event_duration ?? 10,
      source: 'gmail',
      source_email_id: email.id,
      kanban_column: isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo',
      color: 'blue',
      status: 'scheduled',
      flexible: true,
    });
    updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
  }, [events, settings, createEvent, updateEmail]);

  const triggerCelebration = useCallback((completedEventId) => {
    const today = new Date();
    const sw = startOfWeek(today);
    const ew = addDays(sw, 7);
    const inWeek = (d) => { const x = parseISO(d); return x >= sw && x < ew; };
    const completedToday = events.filter(e => e.status === 'completed' && e.updated_date && isSameDay(parseISO(e.updated_date), today));
    const completedWeek = events.filter(e => e.status === 'completed' && e.updated_date && inWeek(e.updated_date));
    // The just-completed item isn't refetched yet, so count it explicitly.
    const doneToday = completedToday.length + (completedToday.some(e => e.id === completedEventId) ? 0 : 1);
    const doneThisWeek = completedWeek.length + (completedWeek.some(e => e.id === completedEventId) ? 0 : 1);
    const leftToday = events.filter(e => e.status === 'scheduled' && e.start_time && isSameDay(parseISO(e.start_time), today)).length;
    setCelebration({ open: true, stats: { doneToday, doneThisWeek, leftToday } });
  }, [events]);

  const handleFollowUpAction = useCallback(async (event, action, followUpText) => {
    if (action === 'completed') {
      updateEvent.mutate({ id: event.id, data: { status: 'completed', kanban_column: 'done' } });
      triggerCelebration(event.id);
    } else if (action === 'extend') {
      // The slot ended before the item was finished — reschedule it to the next available
      // slot and sync the new time to Google Calendar.
      const slot = findNextAvailableSlot(events, new Date(), settings);
      if (!slot) { toast.error('No available slot to extend to'); return; }
      const today = new Date();
      const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
      await updateEvent.mutateAsync({ id: event.id, data: { status: 'scheduled', kanban_column: column, start_time: slot.start_time, end_time: slot.end_time, date: slot.date } });
      if (event.gcal_event_id) {
        try { await base44.functions.invoke('updateGCalEvent', { gcal_event_id: event.gcal_event_id, start_time: slot.start_time, end_time: slot.end_time }); } catch {}
      }
      toast.message(`Extended to ${format(parseISO(slot.start_time), 'EEE h:mm a')}`);
    } else if (action === 'cancelled') {
      updateEvent.mutate({ id: event.id, data: { status: 'cancelled', kanban_column: 'past' } });
    } else if (action === 'needs_followup') {
      updateEvent.mutate({ id: event.id, data: { status: 'completed', kanban_column: 'done' } });
      const slot = findNextAvailableSlot(events, new Date(), settings);
      if (slot) {
        const today = new Date();
        const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
        createEvent.mutate({
          title: `Follow-up: ${event.title}`,
          description: followUpText,
          start_time: slot.start_time,
          end_time: slot.end_time,
          date: slot.date,
          duration_minutes: settings.default_event_duration ?? 10,
          source: 'manual',
          kanban_column: column,
          color: 'purple',
          status: 'scheduled',
          followup_note: followUpText,
          flexible: true,
        });
      }
    }
  }, [events, settings, updateEvent, createEvent, triggerCelebration]);

  const handleOpenEmail = useCallback(async (email) => {
    setOpenEmail(email);
    setOpenEmailEventId(null);
    try {
      const existing = await base44.entities.CalendarEvent.filter({ source_email_id: email.id });
      if (existing && existing.length > 0) {
        setOpenEmailEventId(existing[0].id);
        return;
      }
      const slot = findNextAvailableSlot(events, new Date(), settings, true);
      if (!slot) return;
      const created = await createEvent.mutateAsync({
        title: email.subject,
        description: `From: ${email.sender}\n${email.preview}`,
        start_time: slot.start_time,
        end_time: slot.end_time,
        date: slot.date,
        duration_minutes: settings.default_event_duration ?? 10,
        source: 'gmail',
        source_email_id: email.id,
        kanban_column: 'doing',
        color: 'blue',
        status: 'scheduled',
        flexible: true,
      });
      setOpenEmailEventId(created.id);
    } catch {}
  }, [events, settings, createEvent]);

  const handleSetFate = useCallback(async (eventId, fate) => {
    if (!eventId) return;
    const updates = { kanban_column: fate };
    if (fate === 'done') updates.status = 'completed';
    else if (fate === 'past') updates.status = 'cancelled';
    else updates.status = 'scheduled';
    if (fate === 'todo') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const slot = findNextAvailableSlot(events, tomorrow, settings);
      if (slot) { updates.start_time = slot.start_time; updates.end_time = slot.end_time; updates.date = slot.date; }
    }
    await updateEvent.mutateAsync({ id: eventId, data: updates });
    if (fate === 'done') triggerCelebration(eventId);
  }, [events, settings, updateEvent, triggerCelebration]);

  // Push a scheduled item to Google Calendar, then create the local event with the
  // gcal id already set so the webhook sync updates it instead of duplicating it.
  const createAndPushEvent = useCallback(async (data) => {
    let gcalEventId = null;
    if (data.status === 'scheduled') {
      try {
        const res = await base44.functions.invoke('createCalendarEvent', {
          title: data.title,
          description: data.description || '',
          start_time: data.start_time,
          end_time: data.end_time,
        });
        gcalEventId = res?.gcal_event_id || null;
      } catch (e) {
        toast.error('Could not add to Google Calendar: ' + (e?.message || e));
      }
    }
    const created = await createEvent.mutateAsync({
      ...data,
      ...(gcalEventId ? { gcal_event_id: gcalEventId, source: 'google_calendar', calendar_name: 'primary' } : {}),
    });
    if (gcalEventId) {
      // Remove any webhook-created duplicate that shares the same gcal id
      try {
        const dups = await base44.entities.CalendarEvent.filter({ gcal_event_id: gcalEventId });
        await Promise.all(dups.filter(d => d.id !== created.id).map(d => base44.entities.CalendarEvent.delete(d.id)));
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
    return created;
  }, [createEvent, queryClient]);

  // Squeezes a new item at `desiredStart` for `duration` minutes: shifts later flexible
  // items to make room (and syncs them to Google Calendar), nudging past fixed meetings.
  // Returns the actual { start_time, end_time, date } the new item should occupy.
  const applySqueeze = useCallback(async (desiredStart, duration, excludeId) => {
    const pool = excludeId ? events.filter(e => e.id !== excludeId) : events;
    let squeeze;
    try {
      squeeze = computeSqueeze(pool, desiredStart, duration, settings);
    } catch (e) {
      console.error('computeSqueeze failed', e);
      const newEnd = new Date(desiredStart.getTime() + duration * 60000);
      return { start_time: desiredStart.toISOString(), end_time: newEnd.toISOString(), date: format(desiredStart, 'yyyy-MM-dd') };
    }
    if (squeeze.updates.length > 0) {
      try {
        await base44.entities.CalendarEvent.bulkUpdate(
          squeeze.updates.map(u => ({ id: u.id, start_time: u.start_time, end_time: u.end_time, date: u.date }))
        );
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } catch (e) {
        console.error('squeeze bulkUpdate failed', e);
      }
      for (const u of squeeze.updates) {
        const ev = events.find(e => e.id === u.id);
        if (ev?.gcal_event_id) {
          try {
            await base44.functions.invoke('updateGCalEvent', {
              gcal_event_id: ev.gcal_event_id,
              title: ev.title,
              description: ev.description || '',
              start_time: u.start_time,
              end_time: u.end_time,
            });
          } catch {}
        }
      }
    }
    if (squeeze.nudged) toast.message('Placed after a fixed meeting in that slot');
    return { start_time: squeeze.newStart, end_time: squeeze.newEnd, date: squeeze.date };
  }, [events, settings, queryClient]);

  const handleCreateItem = useCallback(async (data) => {
    const today = new Date();
    let startIso = data.start_time;
    let endIso = data.end_time;
    let dateVal = data.date;

    if (data.squeeze) {
      const placed = await applySqueeze(new Date(data.start_time), data.duration_minutes);
      startIso = placed.start_time;
      endIso = placed.end_time;
      dateVal = placed.date;
    }

    const start = new Date(startIso);
    const column = isSameDay(start, today) ? 'doing' : 'todo';
    await createAndPushEvent({
      title: data.title,
      start_time: startIso,
      end_time: endIso,
      date: dateVal,
      duration_minutes: data.duration_minutes,
      source: 'manual',
      flexible: true,
      kanban_column: column,
      color: 'blue',
      status: 'scheduled',
    });
    setAddState(null);
  }, [applySqueeze, createAndPushEvent]);

  // --- Selection & bulk actions ---
  const toggleEmailSelect = useCallback((id) => {
    setSelectedEmailIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const setEmailSelection = useCallback((ids, checked) => {
    setSelectedEmailIds(prev => { const n = new Set(prev); if (checked) ids.forEach(id => n.add(id)); else ids.forEach(id => n.delete(id)); return n; });
  }, []);
  const toggleEventSelect = useCallback((id) => {
    setSelectedEventIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const setEventSelection = useCallback((ids, checked) => {
    setSelectedEventIds(prev => { const n = new Set(prev); if (checked) ids.forEach(id => n.add(id)); else ids.forEach(id => n.delete(id)); return n; });
  }, []);

  const bulkArchiveEmails = useCallback(async () => {
    const ids = [...selectedEmailIds];
    if (!ids.length) return;
    await Promise.all(ids.map(id => updateEmail.mutateAsync({ id, data: { is_actioned: true, is_read: true } })));
    setSelectedEmailIds(new Set());
    toast.success(`Moved ${ids.length} to Past`);
  }, [selectedEmailIds, updateEmail]);

  const bulkDoneEmails = useCallback(async () => {
    const ids = [...selectedEmailIds];
    if (!ids.length) return;
    await Promise.all(ids.map(id => updateEmail.mutateAsync({ id, data: { is_actioned: true, is_read: true } })));
    setSelectedEmailIds(new Set());
    toast.success(`Marked ${ids.length} done`);
  }, [selectedEmailIds, updateEmail]);

  const bulkScheduleEmails = useCallback(async () => {
    const targets = emails.filter(e => selectedEmailIds.has(e.id));
    if (!targets.length) return;
    const booked = [...events];
    let count = 0;
    for (const email of targets) {
      const slot = findNextAvailableSlot(booked, new Date(), settings);
      if (!slot) break;
      booked.push({ start_time: slot.start_time, end_time: slot.end_time });
      await createAndPushEvent({
        title: email.subject,
        description: `From: ${email.sender}\n${email.preview}`,
        start_time: slot.start_time, end_time: slot.end_time, date: slot.date,
        duration_minutes: settings.default_event_duration ?? 10,
        source: 'gmail', source_email_id: email.id,
        kanban_column: isSameDay(parseISO(slot.start_time), new Date()) ? 'doing' : 'todo',
        color: 'blue', status: 'scheduled',
      });
      await updateEmail.mutateAsync({ id: email.id, data: { is_actioned: true } });
      count++;
    }
    queryClient.invalidateQueries({ queryKey: ['emails'] });
    setSelectedEmailIds(new Set());
    toast.success(`Scheduled ${count} emails`);
  }, [selectedEmailIds, emails, events, settings, createAndPushEvent, updateEmail, queryClient]);

  const bulkDeleteEvents = useCallback(async () => {
    const ids = [...selectedEventIds];
    if (!ids.length) return;
    await Promise.all(ids.map(id => base44.entities.CalendarEvent.update(id, { kanban_column: 'past', status: 'cancelled' })));
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setSelectedEventIds(new Set());
    toast.success(`Moved ${ids.length} to Past`);
  }, [selectedEventIds, queryClient]);

  const bulkCompleteEvents = useCallback(async () => {
    const ids = [...selectedEventIds];
    if (!ids.length) return;
    await Promise.all(ids.map(id => base44.entities.CalendarEvent.update(id, { status: 'completed', kanban_column: 'done' })));
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setSelectedEventIds(new Set());
    triggerCelebration(ids[ids.length - 1]);
    toast.success(`Completed ${ids.length} items`);
  }, [selectedEventIds, queryClient, triggerCelebration]);

  const bulkMoveEvents = useCallback(async (column) => {
    const ids = [...selectedEventIds];
    if (!ids.length) return;
    const status = column === 'done' ? 'completed' : column === 'past' ? 'cancelled' : 'scheduled';
    await Promise.all(ids.map(id => base44.entities.CalendarEvent.update(id, { kanban_column: column, status })));
    queryClient.invalidateQueries({ queryKey: ['events'] });
    setSelectedEventIds(new Set());
    if (column === 'done') triggerCelebration(ids[ids.length - 1]);
    toast.success(`Moved ${ids.length} items`);
  }, [selectedEventIds, queryClient, triggerCelebration]);

  const handleDragEnd = useCallback(async (result) => {
    const { source, destination, draggableId } = result;
    // Suppress the click that fires on the droppable after a drag (would open "Add item").
    suppressClickRef.current = true;
    if (!destination) return;
    // Dropped back onto its exact original slot — nothing to do.
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const today = new Date();

    const emailEventData = (email, slot, column, status, duration) => ({
      title: email.subject,
      description: `From: ${email.sender}\n${email.preview}`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      date: slot.date,
      duration_minutes: duration ?? settings.default_event_duration ?? 10,
      source: 'gmail',
      source_email_id: email.id,
      kanban_column: column,
      color: 'blue',
      status,
      flexible: true,
    });

    const resolveEmails = (email) => (selectedEmailIds.has(email.id) && selectedEmailIds.size > 1)
      ? emails.filter(e => selectedEmailIds.has(e.id)) : [email];
    const resolveEvents = (event) => (selectedEventIds.has(event.id) && selectedEventIds.size > 1)
      ? events.filter(e => selectedEventIds.has(e.id) && !e.is_shared_calendar) : [event];

    const massEmailDrop = async (targets, dest) => {
      const booked = [...events];
      if (dest.droppableId.startsWith('calendar-')) {
        const targetDate = dest.droppableId.replace('calendar-', '');
        const duration = settings.default_event_duration ?? 10;
        for (const em of targets) {
          const slot = findNextAvailableSlot(booked, new Date(targetDate), settings, isSameDay(new Date(targetDate), today));
          if (!slot) break;
          const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
          booked.push({ start_time: slot.start_time, end_time: slot.end_time });
          await createEvent.mutateAsync(emailEventData(em, slot, column, 'scheduled', duration));
          updateEmail.mutate({ id: em.id, data: { is_actioned: true } });
        }
      } else if (dest.droppableId.startsWith('kanban-')) {
        const column = dest.droppableId.replace('kanban-', '');
        const isTodayCol = column === 'doing';
        const duration = settings.default_event_duration ?? 10;
        const status = column === 'done' ? 'completed' : column === 'past' ? 'cancelled' : 'scheduled';
        const searchFrom = new Date();
        if (column === 'todo') searchFrom.setDate(searchFrom.getDate() + 1);
        for (const em of targets) {
          const slot = findNextAvailableSlot(booked, searchFrom, { ...settings, default_event_duration: duration }, isTodayCol);
          if (!slot) break;
          booked.push({ start_time: slot.start_time, end_time: slot.end_time });
          await createEvent.mutateAsync(emailEventData(em, slot, column, status, duration));
          updateEmail.mutate({ id: em.id, data: { is_actioned: true } });
        }
      } else if (dest.droppableId === 'schedule') {
        for (const em of targets) {
          const slot = findNextAvailableSlot(booked, today, settings);
          if (!slot) break;
          const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
          booked.push({ start_time: slot.start_time, end_time: slot.end_time });
          await createEvent.mutateAsync(emailEventData(em, slot, column, 'scheduled'));
          updateEmail.mutate({ id: em.id, data: { is_actioned: true } });
        }
      }
    };

    const massEventMove = async (targets, dest) => {
      const booked = [...events];
      if (dest.droppableId.startsWith('kanban-')) {
        const targetColumn = dest.droppableId.replace('kanban-', '');
        for (const ev of targets) {
          const updates = { kanban_column: targetColumn };
          if (targetColumn === 'done') updates.status = 'completed';
          else if (targetColumn === 'past') updates.status = 'cancelled';
          else if (targetColumn === 'doing') {
            updates.status = 'scheduled';
            const slot = findNextAvailableSlot(booked, today, settings, true);
            if (slot) { updates.start_time = slot.start_time; updates.end_time = slot.end_time; updates.date = slot.date; booked.push({ start_time: slot.start_time, end_time: slot.end_time }); }
          } else if (targetColumn === 'todo') {
            updates.status = 'scheduled';
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            const slot = findNextAvailableSlot(booked, tomorrow, settings);
            if (slot) { updates.start_time = slot.start_time; updates.end_time = slot.end_time; updates.date = slot.date; booked.push({ start_time: slot.start_time, end_time: slot.end_time }); }
          }
          await updateEvent.mutateAsync({ id: ev.id, data: updates });
        }
        if (targetColumn === 'done') triggerCelebration(targets[targets.length - 1]?.id);
      } else if (dest.droppableId.startsWith('calendar-')) {
        const targetDate = dest.droppableId.replace('calendar-', '');
        const isTargetToday = isSameDay(new Date(targetDate), today);
        for (const ev of targets) {
          const slot = findNextAvailableSlot(booked, new Date(targetDate), settings, true);
          if (!slot) break;
          booked.push({ start_time: slot.start_time, end_time: slot.end_time });
          updateEvent.mutate({ id: ev.id, data: { start_time: slot.start_time, end_time: slot.end_time, date: slot.date, kanban_column: isTargetToday ? 'doing' : 'todo', status: 'scheduled' } });
        }
      }
    };

    if (draggableId.startsWith('email-')) {
      const emailId = draggableId.replace('email-', '');
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const emailTargets = resolveEmails(email);
      if (emailTargets.length > 1) { await massEmailDrop(emailTargets, destination); setSelectedEmailIds(new Set()); return; }

      if (destination.droppableId.startsWith('calendar-')) {
        const targetDate = destination.droppableId.replace('calendar-', '');
        const duration = settings.default_event_duration ?? 10;
        const dropSlot = slotFromDropY(destination.droppableId, dragPosRef.current.y, duration);
        const desiredStart = dropSlot ? parseISO(dropSlot.start_time) : null;
        // Squeeze flexible items to fit the dropped time (or fall back to next available slot).
        // Dropping onto a fixed meeting nudges the new to-do to just after it.
        const slot = desiredStart
          ? await applySqueeze(desiredStart, duration)
          : findNextAvailableSlot(events, new Date(targetDate), settings, isSameDay(new Date(targetDate), today));
        if (!slot) return;
        const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
        const data = emailEventData(email, slot, column, 'scheduled', duration);
        const ghostId = `ghost-${Date.now()}`;
        setGhosts(prev => [...prev, { id: ghostId, ...data, isGhost: true }]);
        try {
          await createEvent.mutateAsync(data);
        } finally {
          setGhosts(prev => prev.filter(g => g.id !== ghostId));
        }
        updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
      } else if (destination.droppableId.startsWith('kanban-')) {
        const column = destination.droppableId.replace('kanban-', '');
        const isTodayCol = column === 'doing';
        // Emails book the next available slot (default 10 minutes).
        const duration = settings.default_event_duration ?? 10;
        // "To Do" holds future tasks: schedule starting tomorrow so the item stays in the To-Do
        // column (a today slot would roll it into Doing) and shows up on the calendar.
        const searchFrom = new Date();
        if (column === 'todo') searchFrom.setDate(searchFrom.getDate() + 1);
        const slot = findNextAvailableSlot(events, searchFrom, { ...settings, default_event_duration: duration }, isTodayCol);
        if (!slot) return;
        const status = column === 'done' ? 'completed' : column === 'past' ? 'cancelled' : 'scheduled';
        await createEvent.mutateAsync(emailEventData(email, slot, column, status, duration));
        updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
      } else if (destination.droppableId === 'schedule') {
        // Schedule is a chronological list — insert the email at the position it was dropped
        // (between the two items there), squeezing following flexible items to make room.
        const duration = settings.default_event_duration ?? 10;
        const desiredStart = startFromScheduleDrop(events, dragPosRef.current.y);
        const slot = desiredStart
          ? await applySqueeze(desiredStart, duration)
          : (findNextAvailableSlot(events, today, settings, true) || findNextAvailableSlot(events, today, settings));
        if (!slot) return;
        const column = isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo';
        const data = emailEventData(email, slot, column, 'scheduled');
        const ghostId = `ghost-${Date.now()}`;
        setGhosts(prev => [...prev, { id: ghostId, ...data, isGhost: true }]);
        try {
          await createEvent.mutateAsync(data);
        } finally {
          setGhosts(prev => prev.filter(g => g.id !== ghostId));
        }
        updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
      }
      return;
    }

    if (draggableId.startsWith('event-')) {
      const eventId = draggableId.replace('event-', '');
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const eventTargets = resolveEvents(event);
      if (eventTargets.length > 1) { await massEventMove(eventTargets, destination); setSelectedEventIds(new Set()); return; }

      if (destination.droppableId.startsWith('kanban-')) {
        const targetColumn = destination.droppableId.replace('kanban-', '');
        const updates = { kanban_column: targetColumn };
        let slot = null;
        if (targetColumn === 'done') {
          updates.status = 'completed';
        } else if (targetColumn === 'past') {
          updates.status = 'cancelled';
        } else if (targetColumn === 'doing') {
          updates.status = 'scheduled';
          slot = findNextAvailableSlot(events, today, settings, true);
          if (slot) {
            updates.start_time = slot.start_time;
            updates.end_time = slot.end_time;
            updates.date = slot.date;
          }
        } else if (targetColumn === 'todo') {
          updates.status = 'scheduled';
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          slot = findNextAvailableSlot(events, tomorrow, settings);
          if (slot) {
            updates.start_time = slot.start_time;
            updates.end_time = slot.end_time;
            updates.date = slot.date;
          }
        }
        await updateEvent.mutateAsync({ id: event.id, data: updates });
        if (targetColumn === 'done') {
          triggerCelebration(event.id);
        }
        // Moving to Doing schedules it into the next available slot and syncs the Google Calendar entry
        if (targetColumn === 'doing' && slot) {
          try {
            if (event.gcal_event_id) {
              await base44.functions.invoke('updateGCalEvent', {
                gcal_event_id: event.gcal_event_id,
                start_time: slot.start_time,
                end_time: slot.end_time,
              });
            } else {
              const res = await base44.functions.invoke('createCalendarEvent', {
                title: event.title,
                description: event.description || '',
                start_time: slot.start_time,
                end_time: slot.end_time,
              });
              if (res?.gcal_event_id) {
                await base44.entities.CalendarEvent.update(event.id, {
                  gcal_event_id: res.gcal_event_id,
                  source: 'google_calendar',
                  calendar_name: 'primary',
                });
                try {
                  const dups = await base44.entities.CalendarEvent.filter({ gcal_event_id: res.gcal_event_id });
                  await Promise.all(dups.filter(d => d.id !== event.id).map(d => base44.entities.CalendarEvent.delete(d.id)));
                } catch {}
                queryClient.invalidateQueries({ queryKey: ['events'] });
              }
            }
          } catch (e) {
            toast.error('Could not sync to Google Calendar: ' + (e?.message || e));
          }
        }
      } else if (destination.droppableId.startsWith('calendar-')) {
        const targetDate = destination.droppableId.replace('calendar-', '');
        const dur = event.duration_minutes || settings.default_event_duration || 10;
        const dropSlot = slotFromDropY(destination.droppableId, dragPosRef.current.y, dur);
        let slot;
        if (dropSlot && isFlexibleEvent(event)) {
          slot = await applySqueeze(parseISO(dropSlot.start_time), dur, event.id);
        } else if (dropSlot) {
          slot = { start_time: dropSlot.start_time, end_time: dropSlot.end_time, date: dropSlot.date };
        } else {
          slot = findNextAvailableSlot(events, new Date(targetDate), settings, true);
        }
        if (slot) {
          const isTargetToday = isSameDay(parseISO(slot.start_time), today);
          updateEvent.mutate({
            id: event.id,
            data: {
              start_time: slot.start_time,
              end_time: slot.end_time,
              date: slot.date,
              kanban_column: isTargetToday ? 'doing' : 'todo',
              status: 'scheduled',
            },
          });
          if (event.gcal_event_id) {
            try {
              await base44.functions.invoke('updateGCalEvent', { gcal_event_id: event.gcal_event_id, start_time: slot.start_time, end_time: slot.end_time });
            } catch {}
          }
        }
      }
    }
  }, [emails, events, settings, createEvent, updateEvent, updateEmail, createAndPushEvent, applySqueeze, queryClient, triggerCelebration, selectedEmailIds, selectedEventIds]);

  if (onboarded === false) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <DragDropContext onDragStart={() => { suppressClickRef.current = true; }} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        {/* Full-width navbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setScreen(s => s === 'insights' ? 'app' : 'insights')}
            title={screen === 'insights' ? "Back to dashboard" : "View performance insights"}
            className="flex items-center gap-1.5 pr-3 border-r border-border hover:opacity-80 transition-opacity"
          >
            <img
              src="https://media.base44.com/images/public/6a0383b6225245c6dd116653/1946bb15d_ChatGPTImageAug6202612_27_39PM.png"
              alt="Calkanban"
              className="w-6 h-6 rounded-md object-cover"
            />
            <span className="text-sm font-semibold text-foreground tracking-tight">Calkanban</span>
          </button>
          <SearchBar emails={emails} events={events} onOpenEvent={setSearchEvent} onOpenEmail={handleOpenEmail} />
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setView('schedule')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'schedule' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Schedule
            </button>
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'board' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5 rotate-90" />
              Kanban
            </button>
          </div>
          <Button variant="default" size="sm" onClick={() => setAddState({ prefill: {} })} className="h-7 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={showTrend ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTrend((v) => !v)}
              className="h-7 gap-1.5 text-xs"
              title="Toggle weekly productivity trend"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Trends
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="h-7 gap-1.5 text-xs">
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
            <button
              onClick={requestNotifications}
              title="Enable browser notifications"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
            <ThemeToggle />
            <AccountMenu visibility={visibility} events={events} onOpenCommunications={() => setIntegrationsOpen(true)} />
          </div>
        </div>
        {showTrend && screen !== 'insights' && <WeeklyTrendChart events={events} />}
        <div className="flex-1 min-h-0">
          {screen === 'insights' ? (
            <InsightsPanel events={events} emails={emails} onBack={() => setScreen('app')} />
          ) : (
          <PanelGroup direction="horizontal" className="h-full">
        <Panel defaultSize={22} minSize={14} maxSize={45} className="min-w-0">
        <GmailSidebar
          emails={emails}
          onMarkRead={handleMarkRead}
          onSchedule={handleScheduleEmail}
          onSnooze={handleSnoozeEmail}
          onOpen={handleOpenEmail}
          onDelete={handleDeleteEmail}
          selectedIds={selectedEmailIds}
          onToggleSelect={toggleEmailSelect}
          onSelectAll={setEmailSelection}
          onBulkDelete={bulkArchiveEmails}
          onBulkSchedule={bulkScheduleEmails}
          onBulkDone={bulkDoneEmails}
        />
        </Panel>
        <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/30 transition-colors cursor-col-resize data-[resize-handle-state=drag]:bg-primary/50" />
        <Panel defaultSize={78} className="min-w-0">
        <div className="h-full overflow-hidden">
            {view === 'calendar' ? (
              <CalendarPanel
                events={[...activeEvents, ...ghosts]}
                settings={settings}
                onUpdateEvent={(id, data) => updateEvent.mutate({ id, data })}
                onDeleteEvent={handleDeleteEvent}
                onEditEvent={handleUpdateEvent}
                onAddAt={(dateInput, minutes) => {
                  const date = typeof dateInput === 'string' ? dateInput : format(dateInput, 'yyyy-MM-dd');
                  const d = new Date(date + 'T00:00:00');
                  d.setMinutes(minutes);
                  setAddState({ prefill: { date, time: format(d, 'HH:mm') } });
                }}
              />
            ) : view === 'schedule' ? (
              <ScheduleView events={[...activeEvents, ...ghosts]} onAdd={() => setAddState({ prefill: {} })} onDelete={handleDeleteEvent} onUpdate={handleUpdateEvent} />
            ) : (
              <KanbanPanel
                events={visibleEvents}
                onAdd={(column) => setAddState({ prefill: { column } })}
                onDelete={handleDeleteEvent}
                onUpdate={handleUpdateEvent}
                selectedIds={selectedEventIds}
                onToggleSelect={toggleEventSelect}
                onSelectAll={setEventSelection}
                onBulkDelete={bulkDeleteEvents}
                onBulkComplete={bulkCompleteEvents}
                onBulkMove={bulkMoveEvents}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
      )}
      </div>
      </div>

      <FollowUpModal
        event={followUpEvent}
        open={!!followUpEvent}
        onClose={() => setFollowUpEvent(null)}
        onAction={handleFollowUpAction}
      />

      <EmailModal
        email={openEmail}
        eventId={openEmailEventId}
        open={!!openEmail}
        onClose={() => { setOpenEmail(null); setOpenEmailEventId(null); }}
        onSetFate={handleSetFate}
      />

      <AddItemModal
        prefill={addState?.prefill || {}}
        open={!!addState}
        onClose={() => setAddState(null)}
        onCreate={handleCreateItem}
      />

      <LinkedInComposer open={linkedinOpen} onClose={() => setLinkedinOpen(false)} />

      <SlackSettings open={slackOpen} onClose={() => setSlackOpen(false)} settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ['settings'] })} />

      <SyncIntegrationsModal
        open={integrationsOpen}
        onClose={() => setIntegrationsOpen(false)}
        mailAccounts={mailAccounts}
        calendarAccounts={calendarAccounts}
        slackConnected
        slackChannelName={settings.slack_channel_name}
        onConfigureSlack={() => { setIntegrationsOpen(false); setSlackOpen(true); }}
      />

      <CelebrationOverlay
        open={celebration.open}
        stats={celebration.stats}
        onClose={() => setCelebration(c => ({ ...c, open: false }))}
      />

      <EventModal event={searchEvent} open={!!searchEvent} onClose={() => setSearchEvent(null)} onDelete={handleDeleteEvent} onUpdate={handleUpdateEvent} />
    </DragDropContext>
  );
}