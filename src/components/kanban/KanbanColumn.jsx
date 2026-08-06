import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';

const columnConfig = {
  todo: { label: 'To Do', color: 'bg-blue-400', emptyText: 'No upcoming tasks' },
  doing: { label: 'Doing', color: 'bg-amber-400', emptyText: 'Nothing scheduled today' },
  done: { label: 'Done', color: 'bg-emerald-400', emptyText: 'Nothing completed yet' },
  past: { label: 'Past', color: 'bg-slate-400', emptyText: 'No past items' },
};

export default function KanbanColumn({ columnId, events }) {
  const config = columnConfig[columnId];

  return (
    <div className="flex flex-col w-72 min-w-[288px] bg-card rounded-xl border border-border shadow-sm">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{config.label}</span>
        <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
          {events.length}
        </span>
      </div>

      {/* Cards */}
      <Droppable droppableId={`kanban-${columnId}`} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] rounded-b-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/10 ring-2 ring-primary/30 ring-inset' : ''
            }`}
          >
            {events.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 text-center pt-10">{config.emptyText}</p>
            )}
            {events.map((event, index) => (
              <Draggable key={event.id} draggableId={`event-${event.id}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <KanbanCard event={event} isDragging={snapshot.isDragging} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}