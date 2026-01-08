import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your personal account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-lg">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{profile?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Institution ID</label>
            <p className="text-lg font-mono text-sm">
              {profile?.institution_uuid || 'Not assigned'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
