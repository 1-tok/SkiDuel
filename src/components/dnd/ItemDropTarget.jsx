import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Mail } from 'lucide-react';

// Wraps an item card so an email dragged over it can be dropped *into* the
// item (linked) rather than squeezed in as a new event. Shows a hover overlay
// on the underlying item while an email is being dragged over it.
//
// `disabled` should be true whenever the active drag is NOT an email, so
// event-to-event moves fall through to the column/schedule droppable.
export default function ItemDropTarget({ itemId, disabled, className = '', compact = false, children }) {
  return (
    <Droppable droppableId={`item-${itemId}`} type="TASK" isDropDisabled={!!disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`relative ${className} ${snapshot.isDraggingOver ? 'ring-2 ring-primary rounded-lg' : ''}`}
        >
          {children}
          {snapshot.isDraggingOver && !compact && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none rounded-lg bg-primary/15 ring-2 ring-primary">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-background px-2 py-0.5 rounded-full shadow">
                <Mail className="w-3 h-3" /> Drop into item
              </span>
            </div>
          )}
        </div>
      )}
    </Droppable>
  );
}