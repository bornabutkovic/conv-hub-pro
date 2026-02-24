import { useState, useEffect } from 'react';
import { getRoleDisplayName } from '@/lib/roles';
import { Settings as SettingsIcon, Building2, User, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  oib: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  invoice_email: string;
}

export default function Settings() {
  const { profile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loadingInstitution, setLoadingInstitution] = useState(true);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchInstitution = async () => {
      if (!profile?.institution_uuid) {
        setLoadingInstitution(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, oib, address, city, postal_code, country, invoice_email')
          .eq('id', profile.institution_uuid)
          .single();

        if (error) throw error;
        setInstitution(data);
      } catch (error) {
        console.error('Error fetching institution:', error);
      } finally {
        setLoadingInstitution(false);
      }
    };

    fetchInstitution();
  }, [profile?.institution_uuid]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'destructive';
      case 'company_admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const formatRole = (role: string | null) => {
    return getRoleDisplayName(role);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: User Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Profile
                </CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        first_name: profile?.first_name || '',
                        last_name: profile?.last_name || '',
                        phone: profile?.phone || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="ml-1">Save</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+385 91 123 4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <Badge variant={getRoleBadgeVariant(profile?.role)}>
                      {formatRole(profile?.role)}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{profile?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-lg">{profile?.phone || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <div className="mt-1">
                    <Badge variant={getRoleBadgeVariant(profile?.role)}>
                      {formatRole(profile?.role)}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2: My Institution (Read-Only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              My Institution
            </CardTitle>
            <CardDescription>
              Your linked organization details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingInstitution ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : institution ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="text-lg font-medium">{institution.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">OIB</label>
                  <p className="font-mono">{institution.oib}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p>{institution.address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Email</label>
                  <p>{institution.invoice_email}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No institution linked</p>
                <p className="text-sm">Contact an admin to assign you to an organization.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
