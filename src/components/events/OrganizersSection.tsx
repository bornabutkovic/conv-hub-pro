import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Building2, Loader2 } from 'lucide-react';

interface OrganizersSectionProps {
  eventId: string;
  primaryInstitutionId: string | null | undefined;
}

interface OrganizerRow {
  id: string;
  institution_id: string;
  role: string;
  display_order: number;
  institution_name: string;
}

export function OrganizersSection({ eventId, primaryInstitutionId }: OrganizersSectionProps) {
  const queryClient = useQueryClient();
  const [selectedCoOrgId, setSelectedCoOrgId] = useState<string>('');
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const { data: organizers = [], refetch } = useQuery({
    queryKey: ['event-organizers', eventId],
    queryFn: async (): Promise<OrganizerRow[]> => {
      const { data, error } = await supabase
        .from('event_organizers')
        .select('id, institution_id, role, display_order, institutions:institution_id (name)')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        institution_id: r.institution_id,
        role: r.role,
        display_order: r.display_order,
        institution_name: r.institutions?.name || '—',
      }));
    },
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['all-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const coOrganizers = organizers.filter((o) => o.role === 'co_organizer');
  const technicalOrganizer = organizers.find((o) => o.role === 'technical_organizer');

  const usedIds = new Set(organizers.map((o) => o.institution_id));
  if (primaryInstitutionId) usedIds.add(primaryInstitutionId);

  const availableForCoOrg = institutions.filter((i) => !usedIds.has(i.id));
  const availableForTech = institutions.filter(
    (i) => i.id !== primaryInstitutionId && i.id !== technicalOrganizer?.institution_id
  );

  const refresh = async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['event', eventId] });
  };

  const addCoOrganizer = async () => {
    if (!selectedCoOrgId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('event_organizers').insert({
        event_id: eventId,
        institution_id: selectedCoOrgId,
        role: 'co_organizer',
        display_order: coOrganizers.length,
      });
      if (error) throw error;
      toast.success('Co-organizer added');
      setSelectedCoOrgId('');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add co-organizer');
    } finally {
      setBusy(false);
    }
  };

  const removeOrganizer = async (id: string, label: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from('event_organizers').delete().eq('id', id);
      if (error) throw error;
      toast.success(`${label} removed`);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  const setTechnicalOrganizer = async () => {
    if (!selectedTechId) return;
    setBusy(true);
    try {
      if (technicalOrganizer) {
        const { error: delError } = await supabase
          .from('event_organizers')
          .delete()
          .eq('id', technicalOrganizer.id);
        if (delError) throw delError;
      }
      const { error } = await supabase.from('event_organizers').insert({
        event_id: eventId,
        institution_id: selectedTechId,
        role: 'technical_organizer',
        display_order: 0,
      });
      if (error) throw error;
      toast.success('Technical organizer set');
      setSelectedTechId('');
      await refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set technical organizer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suorganizatori / Co-organizers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Co-organizers */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Suorganizatori</h4>
          {coOrganizers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No co-organizers yet.</p>
          ) : (
            <div className="space-y-2">
              {coOrganizers.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{org.institution_name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={busy}
                    onClick={() => removeOrganizer(org.id, org.institution_name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Select value={selectedCoOrgId} onValueChange={setSelectedCoOrgId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Odaberite instituciju" />
              </SelectTrigger>
              <SelectContent>
                {availableForCoOrg.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nema dostupnih institucija
                  </div>
                ) : (
                  availableForCoOrg.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={addCoOrganizer}
              disabled={!selectedCoOrgId || busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dodaj'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Technical Organizer */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Tehnički organizator</h4>
          {technicalOrganizer ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{technicalOrganizer.institution_name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={busy}
                onClick={() =>
                  removeOrganizer(technicalOrganizer.id, technicalOrganizer.institution_name)
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No technical organizer set.</p>
          )}
          <div className="flex gap-2">
            <Select value={selectedTechId} onValueChange={setSelectedTechId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Odaberite instituciju" />
              </SelectTrigger>
              <SelectContent>
                {availableForTech.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nema dostupnih institucija
                  </div>
                ) : (
                  availableForTech.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={setTechnicalOrganizer}
              disabled={!selectedTechId || busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Postavi'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
