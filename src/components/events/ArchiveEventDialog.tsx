import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ArchiveEventDialogProps {
  eventId: string;
  eventName: string;
  paidAttendeesCount: number;
}

export function ArchiveEventDialog({ eventId, eventName, paidAttendeesCount }: ArchiveEventDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'archived' })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event archived successfully');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      navigate('/events');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive event');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive "{eventName}"?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to archive this event? It will no longer be visible to organizers or attendees.
            </p>
            {paidAttendeesCount > 0 && (
              <p className="font-medium text-amber-600">
                ⚠️ This event has {paidAttendeesCount} paid attendee{paidAttendeesCount !== 1 ? 's' : ''}.
                Archiving will not affect existing tickets or payments.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isArchiving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isArchiving ? 'Archiving…' : 'Archive Event'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
