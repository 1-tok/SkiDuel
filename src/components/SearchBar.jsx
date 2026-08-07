import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Mail, Calendar, X } from 'lucide-react';
import { getEventColor } from '@/lib/scheduling';
import { format, parseISO } from 'date-fns';

export default function SearchBar({ emails, events, onOpenEvent, onOpenEmail }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return { events: [], emails: [] };
    const evs = events.filter(e =>
      (e.title || '').toLowerCase().includes(query) ||
      (e.description || '').toLowerCase().includes(query) ||
      (e.calendar_name || '').toLowerCase().includes(query)
    ).slice(0, 8);
    const mails = emails.filter(m =>
      (m.subject || '').toLowerCase().includes(query) ||
      (m.sender || '').toLowerCase().includes(query) ||
      (m.sender_email || '').toLowerCase().includes(query) ||
      (m.preview || '').toLowerCase().includes(query)
    ).slice(0, 8);
    return { events: evs, emails: mails };
  }, [q, events, emails]);

  const hasResults = results.events.length > 0 || results.emails.length > 0;
  const active = show && q.trim().length > 0;

  const pickEvent = (ev) => { setShow(false); setQ(''); onOpenEvent?.(ev); };
  const pickEmail = (m) => { setShow(false); setQ(''); onOpenEmail?.(m); };

  return (
    <div ref={wrapRef} className="relative w-56">
      <div className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-input bg-background/60 focus-within:bg-background transition-colors">
        <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
          placeholder="Search items…"
          className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
        {q && (
          <button onClick={() => { setQ(''); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {active && (
        <div className="absolute right-0 top-9 z-50 w-80 max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {!hasResults ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</div>
          ) : (
            <div className="py-1">
              {results.events.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Events
                  </div>
                  {results.events.map(ev => {
                    const c = getEventColor(ev.color);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => pickEvent(ev)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-start gap-2 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-foreground truncate">{ev.title}</span>
                          {ev.start_time && (
                            <span className="block text-[10px] text-muted-foreground truncate">
                              {format(parseISO(ev.start_time), 'EEE MMM d, h:mm a')}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
              {results.emails.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t border-border/60 mt-1">
                    <Mail className="w-3 h-3" /> Mail
                  </div>
                  {results.emails.map(m => (
                    <button
                      key={m.id}
                      onClick={() => pickEmail(m)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-start gap-2 transition-colors"
                    >
                      <Mail className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-foreground truncate">{m.subject}</span>
                        <span className="block text-[10px] text-muted-foreground truncate">{m.sender}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}