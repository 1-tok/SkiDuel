import React from 'react';
import { parseISO, isBefore } from 'date-fns';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({ events }) {
  const now = new Date();
  const isPast = (e) => e.start_time && isBefore(parseISO(e.start_time), now);

  const columns = {
    todo: events.filter(e => e.kanban_column === 'todo' && !isPast(e)),
    doing: events.filter(e => e.kanban_column === 'doing'),
    done: events.filter(e => e.kanban_column === 'done'),
    past: events.filter(e => e.kanban_column === 'past' || (e.kanban_column === 'todo' && isPast(e))),
  };

  return (
    <div className="flex h-full bg-muted/30 p-4 gap-4 overflow-x-auto">
      {['todo', 'doing', 'done', 'past'].map(col => (
        <KanbanColumn key={col} columnId={col} events={columns[col]} />
      ))}
    </div>
  );
}