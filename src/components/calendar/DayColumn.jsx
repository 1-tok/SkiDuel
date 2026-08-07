import React, { useRef, useState, useCallback } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { format, parseISO, isSameDay, isToday } from 'date-fns';
import CalendarEvent from './CalendarEvent';
import EventModal from '../kanban/EventModal';
import { getEventColor, getCalendarColor } from '@/lib/scheduling';

const HOUR_HEIGHT = 60; // px per hour

export default function DayColumn({ date, events, workStart = 9, workEnd = 18, onUpdateEvent, previewDuration = 30, minWidth = 0, onAddAt, onDeleteEvent }) {
  const containerRef = useRef(null);
  const [draggingEvent, setDraggingEvent] = useState(null);
  const dragState = useRef(null);
  const [overY, setOverY] = useState(null);
  const [modalEvent, setModalEvent] = useState(null);

  const dayEvents = events.filter(e => isSameDay(parseISO(e.start_time), date));
  const ownEvents = dayEvents.filter(e => !e.is_shared_calendar);
  const sharedEvents = dayEvents.filter(e => e.is_shared_calendar);
  const today = isToday(date);

  const getEventLayouts = (evts) => {
    const sorted = [...evts].sort((a, b) => parseISO(a.start_time) - parseISO(b.start_time));
    const columns = [];
    const colEndTimes = [];

    for (const event of sorted) {
      const start = parseISO(event.start_time);
      const end = parseISO(event.end_time);
      let placed = false;
      for (let c = 0; c < colEndTimes.length; c++) {
        if (start >= colEndTimes[c]) {
          columns.push({ event, col: c });
          colEndTimes[c] = end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push({ event, col: colEndTimes.length });
        colEndTimes.push(end);
      }
    }

    const totalCols = colEndTimes.length || 1;
    return columns.map(({ event, col }) => ({ event, col, totalCols }));
  };

  const eventLayouts = getEventLayouts(ownEvents);
  const sharedLayouts = getEventLayouts(sharedEvents);

  const getEventStyle = (event, col, totalCols) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24);
    const width = totalCols > 1 ? `${100 / totalCols}%` : 'calc(100% - 8px)';
    const left = totalCols > 1 ? `${(col / totalCols) * 100}%` : '4px';
    return { top: `${top}px`, height: `${height}px`, width, left };
  };

  const now = new Date();
  const currentTimeTop = today ? ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT : null;

  const snapMinutes = (minutes) => Math.round(minutes / 15) * 15;

  const topToTimeStr = (topPx) => {
    const mins = Math.round((topPx / HOUR_HEIGHT) * 60);
    const d = new Date(date);
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return format(d, 'HH:mm');
  };

  const getMinutesFromY = useCallback((y) => {
    if (!containerRef.current) return 0;
    const scrollContainer = containerRef.current.closest('[data-calendar-scroll]');
    const scrollTop = scrollContainer?.scrollTop ?? 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = y - rect.top + scrollTop;
    return Math.max(0, Math.min(23 * 60 + 59, (relY / HOUR_HEIGHT) * 60));
  }, []);

  const handleEventMouseDown = (e, event) => {
    e.preventDefault();
    e.stopPropagation();

    const start = parseISO(event.start_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const clickedMinutes = getMinutesFromY(e.clientY);
    const offsetMinutes = clickedMinutes - startMinutes;

    dragState.current = { event, offsetMinutes, moved: false };

    const onMouseMove = (moveE) => {
      if (!dragState.current) return;
      if (!dragState.current.moved) {
        dragState.current.moved = true;
        setDraggingEvent({ event, ghostTop: (startMinutes / 60) * HOUR_HEIGHT });
      }
      const currentMinutes = getMinutesFromY(moveE.clientY);
      const newStartMinutes = snapMinutes(currentMinutes - dragState.current.offsetMinutes);
      const clampedStart = Math.max(0, Math.min(23 * 60, newStartMinutes));
      setDraggingEvent(prev => ({ ...prev, ghostTop: (clampedStart / 60) * HOUR_HEIGHT }));
    };

    const onMouseUp = (upE) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (!dragState.current) return;

      if (!dragState.current.moved) {
        const ev = dragState.current.event;
        dragState.current = null;
        setModalEvent(ev);
        return;
      }

      const currentMinutes = getMinutesFromY(upE.clientY);
      const newStartMinutes = snapMinutes(currentMinutes - dragState.current.offsetMinutes);
      const clampedStart = Math.max(0, Math.min(23 * 60, newStartMinutes));

      const origStart = parseISO(dragState.current.event.start_time);
      const origEnd = parseISO(dragState.current.event.end_time);
      const durationMs = origEnd - origStart;

      const newStart = new Date(date);
      newStart.setHours(Math.floor(clampedStart / 60), clampedStart % 60, 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      onUpdateEvent && onUpdateEvent(dragState.current.event.id, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        date: format(newStart, 'yyyy-MM-dd'),
      });

      dragState.current = null;
      setDraggingEvent(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex-1 min-w-0 flex" style={minWidth ? { minWidth: `${minWidth}px` } : undefined}>
      <div className="flex-1 min-w-0">
        <Droppable droppableId={`calendar-${format(date, 'yyyy-MM-dd')}`} type="TASK">
          {(provided, snapshot) => (
            <div
              ref={(el) => {
                provided.innerRef(el);
                containerRef.current = el;
              }}
              {...provided.droppableProps}
              className={`relative select-none transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
              style={{ height: `${24 * HOUR_HEIGHT}px` }}
              onMouseMove={(e) => {
                if (!snapshot.isDraggingOver) { if (overY !== null) setOverY(null); return; }
                const minutes = snapMinutes(getMinutesFromY(e.clientY));
                const clamped = Math.max(0, Math.min(23 * 60, minutes));
                setOverY((clamped / 60) * HOUR_HEIGHT);
              }}
              onMouseLeave={() => setOverY(null)}
              onClick={(e) => {
                if (e.target.closest('[data-event-card]')) return;
                const minutes = snapMinutes(getMinutesFromY(e.clientY));
                onAddAt?.(date, Math.max(0, Math.min(23 * 60, minutes)));
              }}
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

              {/* Own events */}
              {eventLayouts.map(({ event, col, totalCols }) => {
                const style = getEventStyle(event, col, totalCols);

                if (event.isGhost) {
                  return (
                    <div key={event.id} data-event-card style={{ ...style, zIndex: 10 }} className="absolute transition-none">
                      <CalendarEvent event={event} isGhost style={{ position: 'relative', left: 0, right: 0, width: '100%', height: '100%' }} />
                    </div>
                  );
                }

                const isDraggingThis = draggingEvent?.event?.id === event.id;
                const top = isDraggingThis ? `${draggingEvent.ghostTop}px` : style.top;

                return (
                  <div
                    key={event.id}
                    data-event-card
                    onMouseDown={(e) => handleEventMouseDown(e, event)}
                    style={{ ...style, top, zIndex: isDraggingThis ? 50 : 10 }}
                    className={`absolute transition-none ${isDraggingThis ? 'opacity-80 shadow-xl ring-2 ring-primary/30 rounded-lg' : ''}`}
                  >
                    <CalendarEvent event={event} isDragging={isDraggingThis} onDelete={onDeleteEvent} style={{ position: 'relative', left: 0, right: 0, width: '100%', height: '100%' }} />
                  </div>
                );
              })}

              {snapshot.isDraggingOver && overY != null && (
                <div
                  className="absolute left-1 right-1 z-20 rounded-md border-2 border-dashed border-primary bg-primary/15 pointer-events-none"
                  style={{ top: `${overY}px`, height: `${Math.max((previewDuration / 60) * HOUR_HEIGHT, 24)}px` }}
                >
                  <span className="absolute -top-4 left-0 text-[10px] text-primary font-semibold bg-background px-1 rounded shadow-sm whitespace-nowrap">
                    {topToTimeStr(overY)}
                  </span>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {/* Right-hand rail for other people's (shared) schedules */}
      {sharedEvents.length > 0 && (
        <div className="w-28 flex-shrink-0 border-l border-dashed border-border/60 relative bg-muted/20" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          <div className="absolute top-0 left-0 right-0 z-20 text-center text-[9px] uppercase font-semibold tracking-wider text-muted-foreground/70 py-0.5 bg-muted/50 border-b border-dashed border-border/60">
            Others
          </div>
          {hours.map(hour => (
            <div
              key={hour}
              className={`absolute left-0 right-0 border-t ${hour >= workStart && hour < workEnd ? 'border-border/40' : 'border-border/20'}`}
              style={{ top: `${hour * HOUR_HEIGHT}px` }}
            />
          ))}
          {sharedLayouts.map(({ event, col, totalCols }) => {
            const style = getEventStyle(event, col, totalCols);
            const c = getEventColor(getCalendarColor(event));
            return (
              <div
                key={event.id}
                data-event-card
                style={{ ...style, zIndex: 10 }}
                className="absolute"
                onClick={(e) => { e.stopPropagation(); setModalEvent(event); }}
              >
                <div className={`h-full rounded-md border px-1 py-0.5 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow ${c.bg} ${c.border}`}>
                  <div className={`text-[10px] font-semibold leading-tight truncate ${c.text}`}>
                    {format(parseISO(event.start_time), 'h:mm a')}
                  </div>
                  <div className={`text-[10px] leading-tight truncate ${c.text} opacity-80`}>{event.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EventModal event={modalEvent} open={!!modalEvent} onClose={() => setModalEvent(null)} onDelete={onDeleteEvent} />
    </div>
  );
}