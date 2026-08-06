import React, { useState } from 'react';
import { Mail, Eye, EyeOff, Inbox, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import EmailCard from './EmailCard';
import SyncIntegrationsModal from './SyncIntegrationsModal';
import { Draggable, Droppable } from '@hello-pangea/dnd';

export default function GmailSidebar({ emails, onMarkRead, onSchedule, mailAccounts = [], calendarAccounts = [] }) {
  const [showRead, setShowRead] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  const visibleEmails = showRead 
    ? emails 
    : emails.filter(e => !e.is_read && !e.is_actioned);

  return (
    <div className="w-[280px] min-w-[280px] bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Mail</h2>
          <div className="ml-auto flex items-center gap-1">
            {visibleEmails.length > 0 && (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {visibleEmails.length}
              </span>
            )}
            <button
              onClick={() => setIntegrationsOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Sync integrations"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Show read emails</span>
          <Switch checked={showRead} onCheckedChange={setShowRead} className="scale-75" />
        </div>
      </div>

      {/* Email List */}
      <Droppable droppableId="gmail-sidebar" type="TASK">
        {(provided) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-3 space-y-2"
          >
            {visibleEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Inbox className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">No unread emails</p>
              </div>
            ) : (
              visibleEmails.map((email, index) => (
                <Draggable key={email.id} draggableId={`email-${email.id}`} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <EmailCard
                        email={email}
                        onMarkRead={onMarkRead}
                        onSchedule={onSchedule}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <SyncIntegrationsModal
        open={integrationsOpen}
        onClose={() => setIntegrationsOpen(false)}
        mailAccounts={mailAccounts}
        calendarAccounts={calendarAccounts}
      />
    </div>
  );
}