import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstitutionsTable } from '@/components/admin/InstitutionsTable';
import { UsersManager } from '@/components/admin/UsersManager';
import { CreateInstitutionModal } from '@/components/admin/CreateInstitutionModal';
import { PendingApprovalsSection } from '@/components/admin/PendingApprovalsSection';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users } from 'lucide-react';

export default function Admin() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage institutions and users</p>
        </div>
      </div>

      <Tabs defaultValue="institutions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="institutions" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Institutions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="institutions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Institution
            </Button>
          </div>
          <InstitutionsTable />
        </TabsContent>

        <TabsContent value="users">
          <UsersManager />
        </TabsContent>
      </Tabs>

      <CreateInstitutionModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}
