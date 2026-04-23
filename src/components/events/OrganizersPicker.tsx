import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OrganizersPickerProps {
  primaryInstitutionId?: string | null;
  coOrganizerIds: string[];
  onCoOrganizersChange: (ids: string[]) => void;
  technicalOrganizerId: string | null;
  onTechnicalOrganizerChange: (id: string | null) => void;
}

export function OrganizersPicker({
  primaryInstitutionId,
  coOrganizerIds,
  onCoOrganizersChange,
  technicalOrganizerId,
  onTechnicalOrganizerChange,
}: OrganizersPickerProps) {
  const [pendingCo, setPendingCo] = useState('');
  const [pendingTech, setPendingTech] = useState('');
  const [sameAsMain, setSameAsMain] = useState(false);

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

  const nameOf = (id: string) =>
    institutions.find((i) => i.id === id)?.name || '—';

  const usedIds = new Set<string>(coOrganizerIds);
  if (primaryInstitutionId) usedIds.add(primaryInstitutionId);

  const availableForCo = institutions.filter((i) => !usedIds.has(i.id));
  const availableForTech = institutions.filter(
    (i) => i.id !== primaryInstitutionId && i.id !== technicalOrganizerId
  );

  // Reset "same as main" whenever the primary institution changes
  useEffect(() => {
    setSameAsMain(false);
  }, [primaryInstitutionId]);

  const handleSameAsMainChange = (checked: boolean) => {
    setSameAsMain(checked);
    if (checked && primaryInstitutionId) {
      onTechnicalOrganizerChange(primaryInstitutionId);
      setPendingTech('');
    } else {
      onTechnicalOrganizerChange(null);
      setPendingTech('');
    }
  };

  const addCo = () => {
    if (!pendingCo) return;
    onCoOrganizersChange([...coOrganizerIds, pendingCo]);
    setPendingCo('');
  };

  const removeCo = (id: string) => {
    onCoOrganizersChange(coOrganizerIds.filter((x) => x !== id));
  };

  const setTech = () => {
    if (!pendingTech) return;
    onTechnicalOrganizerChange(pendingTech);
    setPendingTech('');
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
          {coOrganizerIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No co-organizers yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {coOrganizerIds.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-sm"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{nameOf(id)}</span>
                  <button
                    type="button"
                    onClick={() => removeCo(id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Select value={pendingCo} onValueChange={setPendingCo}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Odaberite instituciju" />
              </SelectTrigger>
              <SelectContent>
                {availableForCo.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Nema dostupnih institucija
                  </div>
                ) : (
                  availableForCo.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addCo} disabled={!pendingCo}>
              Dodaj
            </Button>
          </div>
        </div>

        <Separator />

        {/* Technical Organizer */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Tehnički organizator</h4>
          {technicalOrganizerId ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{nameOf(technicalOrganizerId)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  onTechnicalOrganizerChange(null);
                  setSameAsMain(false);
                }}
                disabled={sameAsMain}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No technical organizer set.</p>
          )}
          <div className="flex gap-2">
            <Select
              value={pendingTech}
              onValueChange={setPendingTech}
              disabled={sameAsMain}
            >
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
              onClick={setTech}
              disabled={!pendingTech || sameAsMain}
            >
              Postavi
            </Button>
          </div>

          {/* Same as main organizer */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tech-same-as-main"
                checked={sameAsMain}
                onCheckedChange={(c) => handleSameAsMainChange(!!c)}
                disabled={!primaryInstitutionId}
              />
              <Label
                htmlFor="tech-same-as-main"
                className={
                  !primaryInstitutionId
                    ? 'text-sm text-muted-foreground cursor-not-allowed'
                    : 'text-sm cursor-pointer'
                }
              >
                Isti kao glavni organizator / Same as main organizer
              </Label>
            </div>
            {!primaryInstitutionId && (
              <p className="text-xs text-muted-foreground pl-6">
                Odaberite instituciju za event da biste koristili ovu opciju / Select the event institution first
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
