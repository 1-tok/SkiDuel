import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { format, parseISO, isSameDay, isToday } from 'date-fns';
import CalendarEvent from './CalendarEvent';

const HOUR_HEIGHT = 60; // px per hour

export default function DayColumn({ date, events, workStart = 9, workEnd = 18, showDateHeader = false }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), date));
  const today = isToday(date);

  const getEventStyle = (event) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24);
    return { top: `${top}px`, height: `${height}px` };
  };

  // Current time indicator
  const now = new Date();
  const currentTimeTop = today ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT : null;

  return (
    <div className="flex-1 min-w-0">
      {showDateHeader && (
        <div className={`text-center py-2 border-b border-border sticky top-0 bg-card/80 backdrop-blur-sm z-10 ${today ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="text-[10px] font-medium uppercase">{format(date, 'EEE')}</div>
          <div className={`text-lg font-semibold ${today ? 'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto' : ''}`}>
            {format(date, 'd')}
          </div>
        </div>
      )}
      <Droppable droppableId={`calendar-${format(date, 'yyyy-MM-dd')}`} type="TASK">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`relative ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
            style={{ height: `${24 * HOUR_HEIGHT}px` }}
          >
            {/* Hour lines */}
            {hours.map(hour => (
              <div
                key={hour}
                className={`absolute left-0 right-0 border-t ${
                  hour >= workStart && hour < workEnd 
                    ? 'border-border/60 bg-transparent' 
                    : 'border-border/30 bg-muted/30'
                }`}
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Current time indicator */}
            {currentTimeTop !== null && (
              <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${currentTimeTop}px` }}>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                  <div className="flex-1 h-[1.5px] bg-destructive" />
                </div>
              </div>
            )}

            {/* Events */}
            {dayEvents.map((event, index) => (
              <Draggable key={event.id} draggableId={`event-${event.id}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      ...(snapshot.isDragging ? {} : getEventStyle(event))
                    }}
                    className={snapshot.isDragging ? '' : 'absolute left-1 right-1'}
                  >
                    <CalendarEvent
                      event={event}
                      isDragging={snapshot.isDragging}
                      style={snapshot.isDragging ? {} : { position: 'relative', left: 0, right: 0 }}
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