import { Brain, Phone, Mail, Target, ClipboardList } from 'lucide-react';

// Reusable task templates. Drag onto the calendar / board / schedule to create
// a flexible event with the template's default duration and color.
export const TEMPLATES = [
  { id: 'deep-work', title: 'Deep Work', color: 'purple', duration: 90, icon: Brain },
  { id: 'client-call', title: 'Client Call', color: 'blue', duration: 30, icon: Phone },
  { id: 'email-reply', title: 'Email Reply', color: 'green', duration: 15, icon: Mail },
  { id: 'focus-block', title: 'Focus Block', color: 'orange', duration: 60, icon: Target },
  { id: 'admin', title: 'Admin', color: 'pink', duration: 30, icon: ClipboardList },
];