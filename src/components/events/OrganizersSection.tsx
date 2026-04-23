import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Building2, Loader2, Plus, Pencil } from 'lucide-react';

interface OrganizerEntry {
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  phone?: string;
  oib?: string;
  email?: string;
}

interface OrganizersInfo {
  co_organizers?: OrganizerEntry[];
  technical_organizer?: OrganizerEntry | null;
}

interface OrganizersSectionProps {
  eventId: string;
}

const emptyDraft = (): OrganizerEntry => ({
  name: '',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  website: '',
  phone: '',
  oib: '',
  email: '',
});

const cleanEntry = (e: OrganizerEntry): OrganizerEntry => {
  const out: OrganizerEntry = { name: e.name.trim() };
  (['address', 'city', 'postal_code', 'country', 'website', 'phone', 'oib', 'email'] as const).forEach((k) => {
    const v = (e[k] || '').trim();
    if (v) (out as any)[k] = v;
  });
  return out;
};

export function OrganizersSection({ eventId }: OrganizersSectionProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Co-organizer form state: index === -1 means "new", number means editing existing index, null means form closed
  const [coEditIdx, setCoEditIdx] = useState<number | null>(null);
  const [coDraft, setCoDraft] = useState<OrganizerEntry>(emptyDraft());

  // Technical organizer form state
  const [showTechForm, setShowTechForm] = useState(false);
  const [techDraft, setTechDraft] = useState<OrganizerEntry>(emptyDraft());
  const [techSameAsOrganizer, setTechSameAsOrganizer] = useState<boolean>(false);

  const handleTechSameAsOrganizerChange = async (checked: boolean) => {
    setTechSameAsOrganizer(checked);
    if (!checked) {
      setTechDraft(emptyDraft());
      return;
    }
    try {
      const { data, error } = await supabase
        .from('events')
        .select('institutions:institution_uuid(*)')
        .eq('id', eventId)
        .maybeSingle();
      if (error) throw error;
      const inst: any = (data as any)?.institutions;
      if (!inst) {
        toast.error('Podaci o organizatoru nisu dostupni');
        setTechSameAsOrganizer(false);
        return;
      }
      setTechDraft({
        name: inst.name || '',
        address: inst.address || '',
        city: inst.city || '',
        postal_code: inst.postal_code || '',
        country: inst.country || '',
        website: inst.website || '',
        phone: inst.phone || '',
        oib: inst.oib || '',
        email: inst.invoice_email || '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Greška pri dohvaćanju podataka');
      setTechSameAsOrganizer(false);
    }
  };

  const { data: info } = useQuery({
    queryKey: ['event-organizers-info', eventId],
    queryFn: async (): Promise<OrganizersInfo> => {
      const { data, error } = await supabase
        .from('events')
        .select('organizers_info')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return (data?.organizers_info as OrganizersInfo) || {};
    },
  });

  const coOrganizers = info?.co_organizers || [];
  const technicalOrganizer = info?.technical_organizer || null;

  const persist = async (next: OrganizersInfo) => {
    const payload =
      (next.co_organizers && next.co_organizers.length) || next.technical_organizer
        ? next
        : {};
    const { error } = await supabase
      .from('events')
      .update({ organizers_info: payload as any })
      .eq('id', eventId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['event-organizers-info', eventId] });
    queryClient.invalidateQueries({ queryKey: ['event', eventId] });
  };

  const saveCoOrganizer = async () => {
    if (!coDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    setBusy(true);
    try {
      const entry = cleanEntry(coDraft);
      let nextList: OrganizerEntry[];
      if (coEditIdx === -1 || coEditIdx === null) {
        nextList = [...coOrganizers, entry];
      } else {
        nextList = coOrganizers.map((o, i) => (i === coEditIdx ? entry : o));
      }
      await persist({ ...info, co_organizers: nextList });
      toast.success(coEditIdx === -1 || coEditIdx === null ? 'Suorganizator dodan' : 'Suorganizator ažuriran');
      setCoDraft(emptyDraft());
      setCoEditIdx(null);
    } catch (err: any) {
      toast.error(err.message || 'Greška pri spremanju');
    } finally {
      setBusy(false);
    }
  };

  const removeCoOrganizer = async (index: number) => {
    setBusy(true);
    try {
      const next: OrganizersInfo = {
        ...info,
        co_organizers: coOrganizers.filter((_, i) => i !== index),
      };
      await persist(next);
      toast.success('Suorganizator uklonjen');
      if (coEditIdx === index) {
        setCoEditIdx(null);
        setCoDraft(emptyDraft());
      }
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const startEditCo = (index: number) => {
    setCoDraft({ ...emptyDraft(), ...coOrganizers[index] });
    setCoEditIdx(index);
  };

  const startNewCo = () => {
    setCoDraft(emptyDraft());
    setCoEditIdx(-1);
  };

  const cancelCoForm = () => {
    setCoEditIdx(null);
    setCoDraft(emptyDraft());
  };

  const saveTechnical = async () => {
    if (!techDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    setBusy(true);
    try {
      const entry = cleanEntry(techDraft);
      await persist({ ...info, technical_organizer: entry });
      toast.success('Tehnički organizator spremljen');
      setTechDraft(emptyDraft());
      setShowTechForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Greška pri spremanju');
    } finally {
      setBusy(false);
    }
  };

  const removeTechnical = async () => {
    setBusy(true);
    try {
      await persist({ ...info, technical_organizer: null });
      toast.success('Tehnički organizator uklonjen');
      setShowTechForm(false);
      setTechDraft(emptyDraft());
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const startEditTech = () => {
    if (technicalOrganizer) {
      setTechDraft({ ...emptyDraft(), ...technicalOrganizer });
      setShowTechForm(true);
    }
  };

  const startNewTech = () => {
    setTechDraft(emptyDraft());
    setShowTechForm(true);
  };

  const cancelTechForm = () => {
    setShowTechForm(false);
    setTechDraft(emptyDraft());
  };

  const renderEntryRow = (
    entry: OrganizerEntry,
    onEdit: () => void,
    onRemove: () => void
  ) => (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate font-medium">{entry.name}</span>
        {entry.city ? (
          <span className="text-xs text-muted-foreground truncate">· {entry.city}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={busy}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={busy}
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderInlineForm = (
    draft: OrganizerEntry,
    setDraft: (d: OrganizerEntry) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string
  ) => (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Naziv *</Label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Naziv organizatora"
          disabled={busy}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Adresa</Label>
          <Input
            value={draft.address || ''}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Ulica i kućni broj"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Grad</Label>
          <Input
            value={draft.city || ''}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            placeholder="Zagreb"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Poštanski broj</Label>
          <Input
            value={draft.postal_code || ''}
            onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
            placeholder="10000"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Država</Label>
          <Input
            value={draft.country || ''}
            onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            placeholder="Hrvatska"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Telefon</Label>
          <Input
            value={draft.phone || ''}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+385..."
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Website</Label>
          <Input
            value={draft.website || ''}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
            placeholder="https://..."
            disabled={busy}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Odustani
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={busy || !draft.name.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saveLabel}
        </Button>
      </div>
    </div>
  );

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
            <p className="text-sm text-muted-foreground">Nema suorganizatora</p>
          ) : (
            <div className="space-y-2">
              {coOrganizers.map((org, idx) => (
                <div key={idx}>
                  {renderEntryRow(
                    org,
                    () => startEditCo(idx),
                    () => removeCoOrganizer(idx)
                  )}
                </div>
              ))}
            </div>
          )}

          {coEditIdx !== null ? (
            renderInlineForm(
              coDraft,
              setCoDraft,
              saveCoOrganizer,
              cancelCoForm,
              coEditIdx === -1 ? 'Spremi' : 'Ažuriraj'
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startNewCo}
              disabled={busy}
            >
              <Plus className="h-4 w-4 mr-1" />
              Dodaj suorganizatora
            </Button>
          )}
        </div>

        <Separator />

        {/* Technical Organizer */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Tehnički organizator</h4>
          {technicalOrganizer ? (
            renderEntryRow(technicalOrganizer, startEditTech, removeTechnical)
          ) : (
            <p className="text-sm text-muted-foreground">Nema tehničkog organizatora</p>
          )}

          {showTechForm ? (
            renderInlineForm(
              techDraft,
              setTechDraft,
              saveTechnical,
              cancelTechForm,
              technicalOrganizer ? 'Ažuriraj' : 'Spremi'
            )
          ) : (
            !technicalOrganizer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startNewTech}
                disabled={busy}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj tehničkog organizatora
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
