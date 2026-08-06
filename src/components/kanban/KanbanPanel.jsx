import React from 'react';
import { parseISO, isBefore } from 'date-fns';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({ events }) {
  const now = new Date();
  // Exclude events from calendars shared with the user — they only show on the Calendar view.
  const own = events.filter(e => !e.is_shared_calendar);
  const isPast = (e) => e.start_time && isBefore(parseISO(e.start_time), now);

  const columns = {
    todo: own.filter(e => e.kanban_column === 'todo' && !isPast(e)),
    doing: own.filter(e => e.kanban_column === 'doing'),
    done: own.filter(e => e.kanban_column === 'done'),
    past: own.filter(e => e.kanban_column === 'past' || (e.kanban_column === 'todo' && isPast(e))),
  };

  return (
    <div className="flex h-full bg-muted/30 p-4 gap-4 overflow-x-auto">
      {['todo', 'doing', 'done', 'past'].map(col => (
        <KanbanColumn key={col} columnId={col} events={columns[col]} />
      ))}
    </div>
  );
}