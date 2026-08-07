import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, format, parseISO, isSameDay } from 'date-fns';
import { getEventColor, getCalendarColor } from '@/lib/scheduling';
import EventModal from '../kanban/EventModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({ currentDate, events, setCurrentDate, setViewMode }) {
  const [modalEvent, setModalEvent] = useState(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="flex-1 min-h-0 overflow-auto overscroll-contain p-3 bg-muted/30">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-[10px] font-semibold uppercase text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayEvents = events.filter(e => e.start_time && isSameDay(parseISO(e.start_time), day));
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <Droppable key={day.toISOString()} droppableId={`calendar-${format(day, 'yyyy-MM-dd')}`} type="TASK">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[104px] rounded-lg border p-1.5 flex flex-col ${
                    inMonth ? 'bg-card border-border' : 'bg-muted/40 border-transparent'
                  } ${today ? 'ring-2 ring-primary' : ''} ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
                >
                  <button
                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                    className="text-[11px] font-semibold mb-1 self-start"
                  >
                    {today ? (
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                        {format(day, 'd')}
                      </span>
                    ) : (
                      <span className={inMonth ? 'text-foreground' : 'text-muted-foreground/60'}>{format(day, 'd')}</span>
                    )}
                  </button>
                  <div className="space-y-1 min-h-0 overflow-hidden">
                    {dayEvents.slice(0, 3).map(e => {
                      const c = getEventColor(getCalendarColor(e));
                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); setModalEvent(e); }}
                          className={`w-full text-left text-[10px] truncate px-1 py-0.5 rounded ${c.bg} ${c.text} hover:ring-1 hover:ring-primary/40 transition-shadow`}
                          title={e.title}
                        >
                          {e.start_time && format(parseISO(e.start_time), 'HH:mm')} {e.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>

      <EventModal event={modalEvent} open={!!modalEvent} onClose={() => setModalEvent(null)} />
    </div>
  );
}