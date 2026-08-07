import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { isToday, format, parseISO, isSameDay } from 'date-fns';
import { getEventColor, getCalendarColor } from '@/lib/scheduling';
import EventModal from '../kanban/EventModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekGridView({ days, events, onAddAt, onDeleteEvent }) {
  const [modalEvent, setModalEvent] = useState(null);

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-contain p-3 bg-muted/30">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[10px] font-semibold uppercase text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" style={{ gridAutoRows: 'minmax(150px, 1fr)' }}>
        {days.map(day => {
          const dayEvents = events
            .filter(e => e.start_time && isSameDay(parseISO(e.start_time), day))
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
          const today = isToday(day);
          return (
            <Droppable key={day.toISOString()} droppableId={`calendar-${format(day, 'yyyy-MM-dd')}`} type="TASK">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  onClick={(e) => { if (!e.target.closest('[data-chip]')) onAddAt?.(format(day, 'yyyy-MM-dd'), 9 * 60); }}
                  className={`min-h-[150px] rounded-lg border p-1.5 flex flex-col bg-card ${
                    today ? 'border-primary/40 ring-1 ring-primary/30' : 'border-border'
                  } ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                >
                  <div className="text-[11px] font-semibold mb-1 self-start">
                    {today ? (
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">{format(day, 'd')}</span>
                    ) : (
                      <span className="text-foreground">{format(day, 'd')}</span>
                    )}
                  </div>
                  <div className="space-y-1 min-h-0 overflow-hidden">
                    {dayEvents.slice(0, 6).map(e => {
                      const c = getEventColor(getCalendarColor(e));
                      return (
                        <div
                          key={e.id}
                          data-chip
                          onClick={(ev) => { ev.stopPropagation(); setModalEvent(e); }}
                          className={`text-[10px] truncate px-1 py-0.5 rounded border cursor-pointer ${c.bg} ${c.text} ${c.border}`}
                          title={e.title}
                        >
                          {format(parseISO(e.start_time), 'HH:mm')} {e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 6 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 6} more</div>
                    )}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>

      <EventModal event={modalEvent} open={!!modalEvent} onClose={() => setModalEvent(null)} onDelete={onDeleteEvent} />
    </div>
  );
}