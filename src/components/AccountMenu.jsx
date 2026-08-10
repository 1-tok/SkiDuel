import React, { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, Users, MessageSquare, LogOut } from 'lucide-react';

function isVisible(visibility, account, name) {
  const v = visibility.find(
    (v) => (v.source_account || '') === (account || '') && v.calendar_name === name
  );
  return v ? v.is_visible : true;
}

export default function AccountMenu({ visibility, events, onOpenCommunications }) {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const grouped = useMemo(() => {
    const map = {};
    const seen = {};
    const add = (account, name, isShared) => {
      const acc = account || 'My Account';
      const key = `${acc}|${name}`;
      if (seen[key]) return;
      seen[key] = true;
      if (!map[acc]) map[acc] = [];
      map[acc].push({ calendar_name: name, is_shared: !!isShared });
    };
    visibility.forEach((v) => add(v.source_account, v.calendar_name, v.is_shared));
    events
      .filter((e) => e.source === 'google_calendar' && e.calendar_name)
      .forEach((e) => add(e.source_account, e.calendar_name, e.is_shared_calendar));
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibility, events]);

  const toggle = useMutation({
    mutationFn: async ({ account, name, makeVisible }) => {
      const existing = visibility.find(
        (v) => (v.source_account || '') === (account || '') && v.calendar_name === name
      );
      if (existing) {
        await base44.entities.CalendarVisibility.update(existing.id, { is_visible: makeVisible });
      } else {
        await base44.entities.CalendarVisibility.create({
          source_account: account || '',
          calendar_name: name,
          is_visible: makeVisible,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendarVisibility'] }),
  });

  const initial = (user?.full_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="Account"
          className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user?.full_name || user?.email || 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenCommunications}>
          <MessageSquare className="w-3.5 h-3.5" />
          Communications settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Calendars
        </div>
        <div className="max-h-56 overflow-y-auto">
          {grouped.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-3 py-3 text-center">
              No synced calendars yet.
            </p>
          )}
          {grouped.map(([account, cals]) => (
            <div key={account} className="border-b border-border/40 last:border-0">
              <div className="px-3 pt-1.5 pb-0.5 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                  {(account || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                  {account || 'My Account'}
                </span>
              </div>
              {cals.map((cal) => {
                const visible = isVisible(visibility, account, cal.calendar_name);
                return (
                  <button
                    key={cal.calendar_name}
                    onClick={() => toggle.mutate({ account, name: cal.calendar_name, makeVisible: !visible })}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/60 transition-colors text-left"
                  >
                    {visible ? (
                      <Eye className="w-3.5 h-3.5 text-foreground/70 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={`text-xs truncate flex-1 ${visible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      {cal.calendar_name}
                    </span>
                    {cal.is_shared && <Users className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}