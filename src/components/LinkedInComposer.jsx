import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Linkedin } from 'lucide-react';

export default function LinkedInComposer({ open, onClose }) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await base44.functions.invoke('postToLinkedIn', { text });
      toast.success('Posted to LinkedIn');
      setText('');
      onClose();
    } catch (e) {
      toast.error('LinkedIn post failed: ' + (e?.message || e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            Post to LinkedIn
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share an update with your network…"
          rows={5}
          maxLength={3000}
          className="resize-none"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length}/3000</span>
          <span>Visible to: Public</span>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={posting}>Cancel</Button>
          <Button onClick={handlePost} disabled={posting || !text.trim()}>
            {posting ? 'Posting…' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}