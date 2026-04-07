import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useRejectionAlerts } from '@/hooks/useRejectionAlerts';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RejectionAlertBanner() {
  const { data } = useRejectionAlerts();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed || !data?.hasRejections) return null;

  return (
    <Alert className="border-destructive/50 bg-destructive/10 mb-0 rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            One or more of your events require changes.{' '}
            <Button
              variant="link"
              className="text-destructive underline p-0 h-auto font-semibold"
              onClick={() => navigate('/events')}
            >
              Go to Events to review.
            </Button>
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
