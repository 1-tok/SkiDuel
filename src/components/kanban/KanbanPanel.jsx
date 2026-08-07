import React from 'react';
import { parseISO, isBefore, isToday } from 'date-fns';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({ events, onAdd }) {
  const now = new Date();
  // Exclude events from calendars shared with the user — they only show on the Calendar view.
  const own = events.filter(e => !e.is_shared_calendar);
  const isPast = (e) => e.start_time && isBefore(parseISO(e.start_time), now);
  const isTodayActive = (e) => {
    if (!e.start_time || !isToday(parseISO(e.start_time))) return false;
    if (e.status === 'cancelled' || e.status === 'completed') return false;
    const end = e.end_time ? parseISO(e.end_time) : parseISO(e.start_time);
    return end >= now;
  };

  const columns = {
    todo: own.filter(e => e.kanban_column === 'todo' && !isTodayActive(e) && !isPast(e)),
    doing: own.filter(e => e.kanban_column === 'doing' || (e.kanban_column === 'todo' && isTodayActive(e))),
    done: own.filter(e => e.kanban_column === 'done'),
    past: own.filter(e => e.kanban_column === 'past' || (e.kanban_column === 'todo' && isPast(e) && !isTodayActive(e))),
  };

  return (
    <div className="flex h-full bg-muted/30 p-4 gap-4 overflow-x-auto overscroll-contain">
      {['todo', 'doing', 'done', 'past'].map(col => (
        <KanbanColumn key={col} columnId={col} events={columns[col]} onAdd={onAdd} />
      ))}
    </div>
  );
}