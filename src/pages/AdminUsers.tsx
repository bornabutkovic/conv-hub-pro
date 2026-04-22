import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  Users, 
  Building2, 
  Shield, 
  UserCheck,
  LogIn,
  Settings,
  Crown,
  UserPlus,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { ApproveUserModal } from '@/components/admin/ApproveUserModal';
import type { Tables } from '@/integrations/supabase/types';
import { isAdmin } from '@/lib/roles';
import { toast } from 'sonner';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';

type Profile = Tables<'profiles'>;
type Institution = Tables<'institutions'>;

type ProfileWithInstitution = Profile & {
  institutions?: Institution | null;
};

type TabType = 'pending' | 'organizers' | 'attendees' | 'team';

export default function AdminUsers() {
  const { profile: currentUserProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [approveUser, setApproveUser] = useState<Profile | null>(null);
  const { t } = useAdminLanguage();
  
  const isSuperAdmin = isAdmin(currentUserProfile?.role);

  // Fetch all profiles with institution data
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-all-users-with-institutions'],
    queryFn: async () => {
      // Fetch profiles first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch institutions separately
      const institutionUuids = profilesData
        ?.map(p => p.institution_uuid)
        .filter((uuid): uuid is string => !!uuid);
      
      let institutionsMap: Record<string, Institution> = {};
      
      if (institutionUuids && institutionUuids.length > 0) {
        const { data: institutionsData } = await supabase
          .from('institutions')
          .select('*')
          .in('id', institutionUuids);
        
        if (institutionsData) {
          institutionsMap = institutionsData.reduce((acc, inst) => {
            if (inst.id) acc[inst.id] = inst;
            return acc;
          }, {} as Record<string, Institution>);
        }
      }
      
      // Merge data
      return profilesData?.map(profile => ({
        ...profile,
        institutions: profile.institution_uuid ? institutionsMap[profile.institution_uuid] || null : null
      })) as ProfileWithInstitution[];
    },
  });

  // Pending approval: no institution_uuid and not admin
  const pendingUsers = useMemo(() =>
    users?.filter(u => !u.institution_uuid && !isAdmin(u.role)) || [],
    [users]
  );

  // Filter users by role category
  const organizers = useMemo(() => 
    users?.filter(u => (u.role === 'event_organizer' || u.role === 'admin' || u.role === 'organizer_admin') && u.institution_uuid) || [],
    [users]
  );

  const attendees = useMemo(() => 
    users?.filter(u => (u.role === 'user' || !u.role) && !isAdmin(u.role) && u.institution_uuid) || [],
    [users]
  );

  const superAdmins = useMemo(() => 
    users?.filter(u => isAdmin(u.role)) || [],
    [users]
  );

  // Smart search - filters current tab and can switch tabs
  const getFilteredUsers = (userList: ProfileWithInstitution[], query: string) => {
    if (!query.trim()) return userList;
    const q = query.toLowerCase();
    return userList.filter((user) => {
      const phone = user.phone?.toLowerCase() || '';
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      const institutionName = user.institutions?.name?.toLowerCase() || user.institution?.toLowerCase() || '';
      return phone.includes(q) || fullName.includes(q) || email.includes(q) || institutionName.includes(q);
    });
  };

  const filteredPending = useMemo(() => getFilteredUsers(pendingUsers, searchQuery), [pendingUsers, searchQuery]);
  const filteredOrganizers = useMemo(() => getFilteredUsers(organizers, searchQuery), [organizers, searchQuery]);
  const filteredAttendees = useMemo(() => getFilteredUsers(attendees, searchQuery), [attendees, searchQuery]);
  const filteredSuperAdmins = useMemo(() => getFilteredUsers(superAdmins, searchQuery), [superAdmins, searchQuery]);

  // Smart tab switch on search
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const hasPending = filteredPending.length > 0;
    const hasOrganizers = filteredOrganizers.length > 0;
    const hasAttendees = filteredAttendees.length > 0;
    const hasSuperAdmins = filteredSuperAdmins.length > 0;

    const currentTabEmpty = 
      (activeTab === 'pending' && !hasPending) ||
      (activeTab === 'organizers' && !hasOrganizers) ||
      (activeTab === 'attendees' && !hasAttendees) ||
      (activeTab === 'team' && !hasSuperAdmins);

    if (currentTabEmpty) {
      if (hasPending) setActiveTab('pending');
      else if (hasOrganizers) setActiveTab('organizers');
      else if (hasAttendees) setActiveTab('attendees');
      else if (hasSuperAdmins) setActiveTab('team');
    }
  }, [searchQuery, filteredPending.length, filteredOrganizers.length, filteredAttendees.length, filteredSuperAdmins.length, activeTab]);

  const handleImpersonate = (user: Profile) => {
    toast.info(`Impersonation feature coming soon for ${user.email || user.first_name}`);
  };

  const handleEditSettings = (user: Profile) => {
    toast.info(`Edit settings for ${user.email || user.first_name}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.systemUsers')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.systemUsersSub')}</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('admin.systemUsers')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.systemUsersSub')}</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin.inviteUser')}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('pending')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingUsers.length}</p>
              <p className="text-sm text-muted-foreground">{t('user.pendingApproval')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('organizers')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{organizers.length}</p>
              <p className="text-sm text-muted-foreground">{t('user.platformClients')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('attendees')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <MessageCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendees.length}</p>
              <p className="text-sm text-muted-foreground">{t('user.whatsappAttendees')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('team')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Crown className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{superAdmins.length}</p>
              <p className="text-sm text-muted-foreground">{t('user.conveyoTeam')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('user.tabPending')}</span>
            <Badge variant={pendingUsers.length > 0 ? "destructive" : "secondary"} className="ml-1">{filteredPending.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="organizers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('user.tabClients')}</span>
            <Badge variant="secondary" className="ml-1">{filteredOrganizers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="attendees" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('user.tabAttendees')}</span>
            <Badge variant="secondary" className="ml-1">{filteredAttendees.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">{t('user.tabTeam')}</span>
            <Badge variant="secondary" className="ml-1">{filteredSuperAdmins.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: Pending Approvals */}
        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                {t('user.pendingApprovals')}
              </CardTitle>
              <CardDescription>
                {t('user.pendingApprovalsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPending.length === 0 ? (
                <div className="p-8 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? t('user.noPendingMatch') : t('user.noPendingClear')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('user.name')}</TableHead>
                        <TableHead>{t('user.email')}</TableHead>
                        <TableHead>{t('user.registered')}</TableHead>
                        <TableHead className="text-right">{t('user.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.created_at
                              ? format(new Date(user.created_at), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => setApproveUser(user)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              {t('user.approve')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Platform Clients (Organizers) */}
        <TabsContent value="organizers">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                {t('user.platformClientsFull')}
              </CardTitle>
              <CardDescription>
                {t('user.platformClientsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrganizers.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? t('user.noOrganizersMatch') : t('user.noOrganizers')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('user.organization')}</TableHead>
                        <TableHead>{t('user.contactPerson')}</TableHead>
                        <TableHead>{t('user.email')}</TableHead>
                        <TableHead>{t('user.status')}</TableHead>
                        <TableHead className="text-right">{t('user.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizers.map((user) => (
                        <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-500" />
                              {user.institutions?.name || user.institution || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {t('user.active')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImpersonate(user);
                                }}
                              >
                                <LogIn className="h-4 w-4 mr-1" />
                                {t('user.impersonate')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSettings(user);
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: WhatsApp Attendees */}
        <TabsContent value="attendees">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                {t('user.whatsappAttendees')}
              </CardTitle>
              <CardDescription>
                {t('user.whatsappAttendeesDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAttendees.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? t('user.noAttendeesMatch') : t('user.noAttendees')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {t('user.phoneNumber')}
                          </div>
                        </TableHead>
                        <TableHead>{t('user.name')}</TableHead>
                        <TableHead>{t('user.institution')}</TableHead>
                        <TableHead>{t('user.lastActive')}</TableHead>
                        <TableHead className="text-center">{t('user.whatsapp')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendees.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell className="font-mono font-semibold text-primary">
                            {user.phone || '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.institution || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.created_at
                              ? format(new Date(user.created_at), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.phone ? (
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                {t('user.active')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{t('user.none')}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Conveyo Team (Super Admins) */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-500" />
                Conveyo Team
              </CardTitle>
              <CardDescription>
                Internal team members with super admin privileges.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSuperAdmins.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No team members match your search.' : 'No team members found.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuperAdmins.map((user) => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedUser(user)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                <Crown className="h-4 w-4 text-purple-500" />
                              </div>
                              {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {user.phone || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-500 hover:bg-purple-600 text-white">
                              <Shield className="h-3 w-3 mr-1" />
                              {t('user.superAdmin')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.created_at
                              ? format(new Date(user.created_at), 'dd MMM yyyy')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />

      {/* Approve User Modal */}
      {approveUser && (
        <ApproveUserModal
          open={!!approveUser}
          onOpenChange={(open) => { if (!open) setApproveUser(null); }}
          user={approveUser}
          onApproved={() => {
            setApproveUser(null);
          }}
        />
      )}
    </div>
  );
}
