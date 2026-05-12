import React from 'react';
import KanbanColumn from './KanbanColumn';

export default function KanbanPanel({ events }) {
  const columns = {
    todo: events.filter(e => e.kanban_column === 'todo'),
    doing: events.filter(e => e.kanban_column === 'doing'),
    done: events.filter(e => e.kanban_column === 'done'),
    cancelled: events.filter(e => e.kanban_column === 'cancelled'),
  };

  return (
    <div className="flex h-full bg-muted/30 p-4 gap-4 overflow-x-auto">
      {['todo', 'doing', 'done', 'cancelled'].map(col => (
        <KanbanColumn key={col} columnId={col} events={columns[col]} />
      ))}
    </div>
  );
}