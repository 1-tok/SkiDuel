import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { TEMPLATES } from '@/lib/templates';

export default function TemplatesStrip() {
  return (
    <div className="border-b border-border bg-card px-3 py-2 shrink-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        Templates — drag onto your calendar
      </p>
      <Droppable droppableId="templates" type="TASK" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1"
          >
            {TEMPLATES.map((t, index) => {
              const Icon = t.icon;
              return (
                <Draggable key={t.id} draggableId={`template-${t.id}`} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border whitespace-nowrap cursor-grab active:cursor-grabbing transition-shadow ${
                        snapshot.isDragging
                          ? 'shadow-lg border-primary/50 bg-primary/5'
                          : 'border-border bg-muted/40 hover:bg-muted'
                      }`}
                      title={`Drag to schedule: ${t.title} (${t.duration} min)`}
                    >
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">{t.title}</span>
                      <span className="text-[10px] text-muted-foreground">{t.duration}m</span>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}