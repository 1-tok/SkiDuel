import React, { useState, useRef, useEffect } from 'react';
import { addDays, startOfWeek } from 'date-fns';
import CalendarHeader from './CalendarHeader';
import DayColumn from './DayColumn';

const HOUR_HEIGHT = 60;

export default function CalendarPanel({ events, settings, onUpdateEvent }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const scrollRef = useRef(null);

  const workStart = settings?.work_start_hour ?? 9;
  const workEnd = settings?.work_end_hour ?? 18;

  // Scroll to working hours on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (workStart - 1) * HOUR_HEIGHT;
    }
  }, [workStart]);

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex">
          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
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

          {/* Day columns */}
          {viewMode === 'day' ? (
            <DayColumn
              date={currentDate}
              events={events}
              workStart={workStart}
              workEnd={workEnd}
              onUpdateEvent={onUpdateEvent}
            />
          ) : (
            weekDays.map(day => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                events={events}
                workStart={workStart}
                workEnd={workEnd}
                showDateHeader
                onUpdateEvent={onUpdateEvent}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}