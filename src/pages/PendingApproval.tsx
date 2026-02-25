import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function PendingApproval() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Pending Approval</h1>
            <p className="text-muted-foreground">
              Your account{profile?.email ? ` (${profile.email})` : ''} has been registered but is awaiting approval by an administrator.
            </p>
            <p className="text-sm text-muted-foreground">
              Once approved and assigned to an institution, you'll have full access to the Conwayo dashboard.
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
