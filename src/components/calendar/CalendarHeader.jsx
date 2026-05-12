import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek } from 'date-fns';

export default function CalendarHeader({ currentDate, setCurrentDate, viewMode, setViewMode }) {
  const goToday = () => setCurrentDate(new Date());
  
  const goPrev = () => {
    setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subWeeks(currentDate, 1));
  };
  
  const goNext = () => {
    setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const dateLabel = viewMode === 'day'
    ? format(currentDate, 'EEEE, MMMM d, yyyy')
    : `${format(startOfWeek(currentDate), 'MMM d')} — ${format(addDays(startOfWeek(currentDate), 6), 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{dateLabel}</h2>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goToday} className="text-xs h-7">
          Today
        </Button>
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button variant="ghost" size="icon" onClick={goPrev} className="h-6 w-6">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="h-6 w-6">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 ml-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'day' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'week' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  );
}