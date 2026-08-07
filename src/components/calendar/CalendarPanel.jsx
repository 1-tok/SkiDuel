import React, { useState, useRef, useEffect, useMemo } from 'react';
import { addDays, startOfWeek, isToday, format } from 'date-fns';
import CalendarHeader from './CalendarHeader';
import DayColumn from './DayColumn';
import MonthView from './MonthView';
import WeekGridView from './WeekGridView';

const HOUR_HEIGHT = 60;

export default function CalendarPanel({ events, settings, onUpdateEvent, onAddAt, onDeleteEvent }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const scrollRef = useRef(null);

  const workStart = settings?.work_start_hour ?? 9;
  const workEnd = settings?.work_end_hour ?? 18;
  const previewDuration = settings?.default_event_duration ?? 30;

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const minutesIntoDay = now.getHours() * 60 + now.getMinutes();
      scrollRef.current.scrollTop = Math.max(0, (minutesIntoDay / 60) * HOUR_HEIGHT - 80);
    }
  }, [viewMode]);

  const days = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    const count = viewMode === 'week' ? 7 : 14;
    const start = startOfWeek(currentDate);
    return Array.from({ length: count }, (_, i) => addDays(start, i));
  }, [currentDate, viewMode]);

  if (viewMode === 'month') {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 bg-background min-w-0">
        <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} viewMode={viewMode} setViewMode={setViewMode} />
        <MonthView currentDate={currentDate} events={events} setCurrentDate={setCurrentDate} setViewMode={setViewMode} onDeleteEvent={onDeleteEvent} />
      </div>
    );
  }

  if (viewMode === 'week' || viewMode === 'biweek') {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 bg-background min-w-0">
        <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} viewMode={viewMode} setViewMode={setViewMode} />
        <WeekGridView days={days} events={events} onAddAt={onAddAt} onDeleteEvent={onDeleteEvent} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background min-w-0">
      <CalendarHeader currentDate={currentDate} setCurrentDate={setCurrentDate} viewMode={viewMode} setViewMode={setViewMode} />

      <div ref={scrollRef} data-calendar-scroll className="flex-1 min-h-0 overflow-auto overscroll-contain">
        {/* Date header row (sticky top) */}
        <div className="flex sticky top-0 z-30 bg-background border-b border-border">
          <div className="w-14 flex-shrink-0 sticky left-0 z-40 bg-background border-r border-border" />
          {days.map(day => {
            const today = isToday(day);
            return (
              <div key={day.toISOString()} className="flex-1 min-w-0">
                <div className="text-center py-2">
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">{format(day, 'EEE')}</div>
                  <div className={`text-base font-semibold ${today ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex">
          <div className="w-14 flex-shrink-0 sticky left-0 z-30 bg-background border-r border-border relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-muted-foreground font-medium"
                style={{ top: `${i * HOUR_HEIGHT - 6}px` }}
              >
                {i === 0 ? '' : `${i > 12 ? i - 12 : i} ${i >= 12 ? 'PM' : 'AM'}`}
              </div>
            ))}
          </div>

          {days.map(day => (
            <DayColumn
              key={day.toISOString()}
              date={day}
              events={events}
              workStart={workStart}
              workEnd={workEnd}
              onUpdateEvent={onUpdateEvent}
              previewDuration={previewDuration}
              onAddAt={onAddAt}
              onDeleteEvent={onDeleteEvent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}