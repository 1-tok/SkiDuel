import React, { useRef } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import KanbanCard from './KanbanCard';

const columnConfig = {
  todo: { label: 'To Do', color: 'bg-blue-400', emptyText: 'No upcoming tasks' },
  doing: { label: 'Doing Today', color: 'bg-amber-400', emptyText: 'Nothing scheduled today' },
  done: { label: 'Done', color: 'bg-emerald-400', emptyText: 'Nothing completed yet' },
  past: { label: 'Past', color: 'bg-slate-400', emptyText: 'No past items' },
};

export default function KanbanColumn({ columnId, events, onAdd, onDelete, onUpdate, selectedIds, onToggleSelect, onSelectAll }) {
  const config = columnConfig[columnId];
  const selected = selectedIds || new Set();
  const allSelected = events.length > 0 && events.every(e => selected.has(e.id));
  // Track whether a press started on a card. A real "click empty area to add" starts on the
  // empty area; a released drag (or a sub-threshold drag treated as a click) starts on a card
  // and must NOT open the Add modal.
  const mouseDownOnCard = useRef(false);

  return (
    <div className="flex flex-col w-72 min-w-[288px] bg-card rounded-xl border border-border shadow-sm">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSelectAll?.(events.map(ev => ev.id), e.target.checked)}
          title={`Select all in ${config.label}`}
          className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
        />
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{config.label}</span>
        <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
          {events.length}
        </span>
        <button
          onClick={() => onAdd?.(columnId)}
          title="Add item"
          className="p-1 rounded-md text-muted-foreground/70 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <Droppable droppableId={`kanban-${columnId}`} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            onMouseDown={(e) => { mouseDownOnCard.current = !!e.target.closest('[data-kanban-card]'); }}
            onClick={(e) => {
              if (e.target.closest('[data-kanban-card]')) return;
              if (mouseDownOnCard.current) { mouseDownOnCard.current = false; return; }
              onAdd?.(columnId);
            }}
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
                    data-kanban-card
                  >
                    <KanbanCard
                      event={event}
                      isDragging={snapshot.isDragging}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      selected={selected.has(event.id)}
                      onToggleSelect={onToggleSelect}
                    />
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