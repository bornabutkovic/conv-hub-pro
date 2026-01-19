import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, 
  Mail, 
  User, 
  Building2, 
  Calendar, 
  Ticket,
  MessageCircle 
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface UserDetailsModalProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsModal({ user, open, onOpenChange }: UserDetailsModalProps) {
  // Fetch events this user has attended (via attendees table)
  const { data: attendeeRecords, isLoading: attendeesLoading } = useQuery({
    queryKey: ['user-attendances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get attendees by profile_id
      const { data: byProfileId, error: error1 } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          status,
          created_at,
          event_id,
          events (
            id,
            name,
            start_date,
            end_date,
            location_city
          )
        `)
        .eq('profile_id', user.id);
      
      if (error1) throw error1;
      
      // Also search by phone number if available
      let byPhone: typeof byProfileId = [];
      if (user.phone) {
        const { data, error: error2 } = await supabase
          .from('attendees')
          .select(`
            id,
            first_name,
            last_name,
            status,
            created_at,
            event_id,
            events (
              id,
              name,
              start_date,
              end_date,
              location_city
            )
          `)
          .eq('phone', user.phone);
        
        if (error2) throw error2;
        byPhone = data || [];
      }
      
      // Merge and dedupe by attendee id
      const all = [...(byProfileId || []), ...byPhone];
      const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
      
      return unique;
    },
    enabled: !!user?.id && open,
  });

  if (!user) return null;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
  const eventCount = attendeeRecords?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{fullName}</h3>
              {user.phone && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp Active
                </Badge>
              )}
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="font-mono font-semibold text-foreground">
                  {user.phone || 'No phone number'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email || 'No email'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{user.institution || 'No institution'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {user.created_at 
                    ? format(new Date(user.created_at), 'dd MMMM yyyy')
                    : 'Unknown'}
                </span>
              </div>
            </div>

            {user.role && (
              <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Event History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                Event History
              </h4>
              <Badge variant="outline">{eventCount} event{eventCount !== 1 ? 's' : ''}</Badge>
            </div>

            {attendeesLoading ? (
              <div className="py-4 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : eventCount === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                This user has not attended any events yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {attendeeRecords?.map((record) => (
                  <Card key={record.id} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {record.events?.name || 'Unknown Event'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.events?.location_city && `${record.events.location_city} • `}
                            {record.events?.start_date 
                              ? format(new Date(record.events.start_date), 'dd MMM yyyy')
                              : 'Date TBD'}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            record.status === 'approved' 
                              ? 'default' 
                              : record.status === 'cancelled' 
                                ? 'destructive' 
                                : 'secondary'
                          }
                          className="text-xs"
                        >
                          {record.status || 'pending'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {eventCount > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                This user has attended {eventCount} event{eventCount !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
