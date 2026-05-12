import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';

const columnConfig = {
  todo: { label: 'To Do', color: 'bg-blue-400', emptyText: 'No upcoming tasks' },
  doing: { label: 'Doing', color: 'bg-amber-400', emptyText: 'Nothing scheduled today' },
  done: { label: 'Done', color: 'bg-emerald-400', emptyText: 'Nothing completed yet' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-400', emptyText: 'No cancellations' },
};

export default function KanbanColumn({ columnId, events }) {
  const config = columnConfig[columnId];

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{config.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto bg-muted rounded-full px-1.5 py-0.5">
          {events.length}
        </span>
      </div>

      <Droppable droppableId={`kanban-${columnId}`} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[120px] rounded-lg p-1.5 transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-primary/10' : ''
            }`}
          >
            {events.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center py-8">{config.emptyText}</p>
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