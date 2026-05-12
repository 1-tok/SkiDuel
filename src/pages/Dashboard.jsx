import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { format, parseISO, isSameDay, isBefore } from 'date-fns';
import { findNextAvailableSlot } from '@/lib/scheduling';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import GmailSidebar from '@/components/gmail/GmailSidebar';
import CalendarPanel from '@/components/calendar/CalendarPanel';
import KanbanPanel from '@/components/kanban/KanbanPanel';
import FollowUpModal from '@/components/FollowUpModal';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [followUpEvent, setFollowUpEvent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const followUpTimersRef = useRef({});

  // Initial sync on mount
  useEffect(() => {
    handleSync();
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

  // Mutations
  const updateEmail = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Email.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });

  const createEvent = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  // Follow-up timer: check for events that just ended
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
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [events]);

  // Handle email mark as read
  const handleMarkRead = useCallback((email) => {
    updateEmail.mutate({ id: email.id, data: { is_read: true, is_actioned: true } });
  }, [updateEmail]);

  // Handle email schedule to next slot
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
      duration_minutes: settings.default_event_duration || 30,
      source: 'gmail',
      source_email_id: email.id,
      kanban_column: isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo',
      color: 'blue',
      status: 'scheduled',
    });
    updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
  }, [events, settings, createEvent, updateEmail]);

  // Handle follow-up modal actions
  const handleFollowUpAction = useCallback((event, action, followUpText) => {
    if (action === 'completed') {
      updateEvent.mutate({ id: event.id, data: { status: 'completed', kanban_column: 'done' } });
    } else if (action === 'cancelled') {
      updateEvent.mutate({ id: event.id, data: { status: 'cancelled', kanban_column: 'cancelled' } });
    } else if (action === 'needs_followup') {
      updateEvent.mutate({ id: event.id, data: { status: 'completed', kanban_column: 'done' } });
      // Create follow-up task
      const slot = findNextAvailableSlot(events, new Date(), settings);
      if (slot) {
        createEvent.mutate({
          title: `Follow-up: ${event.title}`,
          description: followUpText,
          start_time: slot.start_time,
          end_time: slot.end_time,
          date: slot.date,
          duration_minutes: settings.default_event_duration || 30,
          source: 'manual',
          kanban_column: 'todo',
          color: 'purple',
          status: 'scheduled',
          followup_note: followUpText,
        });
      }
    }
  }, [events, settings, updateEvent, createEvent]);

  // Drag and drop handler
  const handleDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const today = new Date();

    // Email dragged to calendar or kanban
    if (draggableId.startsWith('email-')) {
      const emailId = draggableId.replace('email-', '');
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      if (destination.droppableId.startsWith('calendar-')) {
        const targetDate = destination.droppableId.replace('calendar-', '');
        const slot = findNextAvailableSlot(events, new Date(targetDate), settings, isSameDay(new Date(targetDate), today));
        if (!slot) return;

        createEvent.mutate({
          title: email.subject,
          description: `From: ${email.sender}\n${email.preview}`,
          start_time: slot.start_time,
          end_time: slot.end_time,
          date: slot.date,
          duration_minutes: settings.default_event_duration || 30,
          source: 'gmail',
          source_email_id: email.id,
          kanban_column: isSameDay(parseISO(slot.start_time), today) ? 'doing' : 'todo',
          color: 'blue',
          status: 'scheduled',
        });
        updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
      } else if (destination.droppableId.startsWith('kanban-')) {
        const column = destination.droppableId.replace('kanban-', '');
        const isToday = column === 'doing';
        const slot = findNextAvailableSlot(events, today, settings, isToday);
        if (!slot) return;

        createEvent.mutate({
          title: email.subject,
          description: `From: ${email.sender}\n${email.preview}`,
          start_time: slot.start_time,
          end_time: slot.end_time,
          date: slot.date,
          duration_minutes: settings.default_event_duration || 30,
          source: 'gmail',
          source_email_id: email.id,
          kanban_column: column,
          color: 'blue',
          status: column === 'done' ? 'completed' : column === 'cancelled' ? 'cancelled' : 'scheduled',
        });
        updateEmail.mutate({ id: email.id, data: { is_actioned: true } });
      }
      return;
    }

    // Event dragged between kanban columns or calendar
    if (draggableId.startsWith('event-')) {
      const eventId = draggableId.replace('event-', '');
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      if (destination.droppableId.startsWith('kanban-')) {
        const targetColumn = destination.droppableId.replace('kanban-', '');
        const updates = { kanban_column: targetColumn };

        if (targetColumn === 'done') {
          updates.status = 'completed';
        } else if (targetColumn === 'cancelled') {
          updates.status = 'cancelled';
        } else if (targetColumn === 'doing') {
          updates.status = 'scheduled';
          // Move to next slot today
          const slot = findNextAvailableSlot(events, today, settings, true);
          if (slot) {
            updates.start_time = slot.start_time;
            updates.end_time = slot.end_time;
            updates.date = slot.date;
          }
        } else if (targetColumn === 'todo') {
          updates.status = 'scheduled';
          // Move to next future slot
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const slot = findNextAvailableSlot(events, tomorrow, settings);
          if (slot) {
            updates.start_time = slot.start_time;
            updates.end_time = slot.end_time;
            updates.date = slot.date;
          }
        }

        updateEvent.mutate({ id: event.id, data: updates });
      } else if (destination.droppableId.startsWith('calendar-')) {
        const targetDate = destination.droppableId.replace('calendar-', '');
        const isTargetToday = isSameDay(new Date(targetDate), today);
        const slot = findNextAvailableSlot(events, new Date(targetDate), settings, true);
        if (slot) {
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
        }
      }
    }
  }, [emails, events, settings, createEvent, updateEvent, updateEmail]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-screen flex overflow-hidden bg-background">
        {/* Sync button */}
        <div className="fixed top-3 right-[340px] z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-7 gap-1.5 text-xs bg-card shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
        </div>
        <GmailSidebar
          emails={emails}
          onMarkRead={handleMarkRead}
          onSchedule={handleScheduleEmail}
        />
        <CalendarPanel events={events} settings={settings} />
        <KanbanPanel events={events} />
      </div>

      <FollowUpModal
        event={followUpEvent}
        open={!!followUpEvent}
        onClose={() => setFollowUpEvent(null)}
        onAction={handleFollowUpAction}
      />
    </DragDropContext>
  );
}