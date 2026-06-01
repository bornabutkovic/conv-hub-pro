import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, isSuperAdmin } from '@/lib/roles';
import { InstitutionsTable } from '@/components/admin/InstitutionsTable';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { PendingApprovalsSection } from '@/components/admin/PendingApprovalsSection';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users, Shield } from 'lucide-react';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

export default function Admin() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useAdminLanguage();

  if (!isAdmin(profile?.role)) {
    return <Navigate to="/" replace />;
  }
  const activeTab = searchParams.get('tab') || 'institutions';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.subtitle')}</p>
        </div>
      </div>

      <PendingApprovalsSection />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="institutions" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('admin.institutions')}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('admin.users')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institutions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => navigate('/admin/institutions/new')} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.createInstitution')}
            </Button>
          </div>
          <InstitutionsTable />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
