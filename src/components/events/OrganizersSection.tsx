import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Building2, Loader2, Plus, Pencil } from 'lucide-react';

const WORKING_DAYS = [
  { value: 'Monday', label: 'Ponedjeljak' },
  { value: 'Tuesday', label: 'Utorak' },
  { value: 'Wednesday', label: 'Srijeda' },
  { value: 'Thursday', label: 'Četvrtak' },
  { value: 'Friday', label: 'Petak' },
  { value: 'Saturday', label: 'Subota' },
  { value: 'Sunday', label: 'Nedjelja' },
];

const WORKING_HOURS_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = (7 + i).toString().padStart(2, '0');
  return `${h}:00`;
});

interface WorkingHoursParts {
  dayFrom: string;
  dayTo: string;
  timeFrom: string;
  timeTo: string;
}

const emptyWorkingHoursParts = (): WorkingHoursParts => ({
  dayFrom: '', dayTo: '', timeFrom: '', timeTo: '',
});

const parseWorkingHours = (value?: string): WorkingHoursParts => {
  const parts = emptyWorkingHoursParts();
  if (!value) return parts;
  // Format: "Monday–Friday 08:00–17:00" (en-dash). Be lenient and accept "-" too.
  const m = value.match(/^([A-Za-z]+)\s*[–-]\s*([A-Za-z]+)\s+(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})$/);
  if (!m) return parts;
  const [, df, dt, tf, tt] = m;
  const validDays = WORKING_DAYS.map((d) => d.value);
  if (validDays.includes(df)) parts.dayFrom = df;
  if (validDays.includes(dt)) parts.dayTo = dt;
  if (WORKING_HOURS_OPTIONS.includes(tf)) parts.timeFrom = tf;
  if (WORKING_HOURS_OPTIONS.includes(tt)) parts.timeTo = tt;
  return parts;
};

const formatWorkingHours = (p: WorkingHoursParts): string => {
  if (p.dayFrom && p.dayTo && p.timeFrom && p.timeTo) {
    return `${p.dayFrom}–${p.dayTo} ${p.timeFrom}–${p.timeTo}`;
  }
  return '';
};

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
  same_as_organizer?: boolean;
}

interface SupportContact {
  name?: string;
  email?: string;
  phone_mobile?: string;
  phone_landline?: string;
  working_hours?: string;
  website?: string;
}

interface OrganizersInfo {
  co_organizers?: OrganizerEntry[];
  technical_organizer?: OrganizerEntry | null;
  support_contact?: SupportContact | null;
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
  if (e.same_as_organizer) {
    out.same_as_organizer = true;
  }
  return out;
};

const emptySupportDraft = (): SupportContact => ({
  name: '', email: '', phone_mobile: '', phone_landline: '', working_hours: '', website: ''
});

const cleanSupport = (e: SupportContact): SupportContact => {
  const out: SupportContact = {};
  (['name', 'email', 'phone_mobile', 'phone_landline', 'working_hours', 'website'] as const).forEach((k) => {
    const v = (e[k] || '').trim();
    if (v) (out as any)[k] = v;
  });
  return out;
};

const isSupportEmpty = (e: SupportContact): boolean =>
  !['name', 'email', 'phone_mobile', 'phone_landline', 'working_hours', 'website']
    .some((k) => ((e as any)[k] || '').trim());

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

  // Support contact form state
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportDraft, setSupportDraft] = useState<SupportContact>(emptySupportDraft());

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
        same_as_organizer: true,
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
  const supportContact = info?.support_contact || null;

  const persist = async (next: OrganizersInfo) => {
    const payload =
      (next.co_organizers && next.co_organizers.length) || next.technical_organizer || next.support_contact
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
      setTechSameAsOrganizer(false);
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
      setTechSameAsOrganizer(false);
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const startEditTech = () => {
    if (technicalOrganizer) {
      setTechDraft({ ...emptyDraft(), ...technicalOrganizer });
      setTechSameAsOrganizer(false);
      setShowTechForm(true);
    }
  };

  const startNewTech = () => {
    setTechDraft(emptyDraft());
    setTechSameAsOrganizer(false);
    setShowTechForm(true);
  };

  const cancelTechForm = () => {
    setShowTechForm(false);
    setTechDraft(emptyDraft());
    setTechSameAsOrganizer(false);
  };

  const saveSupport = async () => {
    if (isSupportEmpty(supportDraft)) {
      await removeSupport();
      return;
    }
    setBusy(true);
    try {
      const entry = cleanSupport(supportDraft);
      await persist({ ...info, support_contact: entry });
      toast.success('Kontakt podrške spremljen');
      setSupportDraft(emptySupportDraft());
      setShowSupportForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Greška pri spremanju');
    } finally {
      setBusy(false);
    }
  };

  const removeSupport = async () => {
    setBusy(true);
    try {
      await persist({ ...info, support_contact: null });
      toast.success('Kontakt podrške uklonjen');
      setShowSupportForm(false);
      setSupportDraft(emptySupportDraft());
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const startEditSupport = () => {
    if (supportContact) {
      setSupportDraft({ ...emptySupportDraft(), ...supportContact });
      setShowSupportForm(true);
    }
  };

  const startNewSupport = () => {
    setSupportDraft(emptySupportDraft());
    setShowSupportForm(true);
  };

  const cancelSupportForm = () => {
    setShowSupportForm(false);
    setSupportDraft(emptySupportDraft());
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
    saveLabel: string,
    topSlot?: ReactNode
  ) => (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      {topSlot}
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
          <Label className="text-xs">OIB / VAT</Label>
          <Input
            value={draft.oib || ''}
            onChange={(e) => setDraft({ ...draft, oib: e.target.value })}
            placeholder="12345678901"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={draft.email || ''}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            placeholder="info@example.com"
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
              technicalOrganizer ? 'Ažuriraj' : 'Spremi',
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                <Checkbox
                  id="tech-same-as-organizer"
                  checked={techSameAsOrganizer}
                  onCheckedChange={(c) => handleTechSameAsOrganizerChange(c === true)}
                  disabled={busy}
                />
                <Label htmlFor="tech-same-as-organizer" className="text-xs cursor-pointer">
                  Isti kao organizator / Same as organizer
                </Label>
              </div>
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

        <Separator />

        {/* Support Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Kontakt podrške / Support Contact</h4>
          {supportContact && !isSupportEmpty(supportContact) ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">
                  {supportContact.name || supportContact.email || 'Kontakt podrške'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={startEditSupport}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={removeSupport}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nema kontakta podrške</p>
          )}

          {showSupportForm ? (
            <div className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Naziv / Name</Label>
                  <Input value={supportDraft.name || ''} onChange={(e) => setSupportDraft({ ...supportDraft, name: e.target.value })} disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={supportDraft.email || ''} onChange={(e) => setSupportDraft({ ...supportDraft, email: e.target.value })} placeholder="podrska@example.com" disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon mobilni</Label>
                  <Input value={supportDraft.phone_mobile || ''} onChange={(e) => setSupportDraft({ ...supportDraft, phone_mobile: e.target.value })} placeholder="+385..." disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefon fiksni</Label>
                  <Input value={supportDraft.phone_landline || ''} onChange={(e) => setSupportDraft({ ...supportDraft, phone_landline: e.target.value })} placeholder="+385 1 ..." disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Radno vrijeme</Label>
                  <Input value={supportDraft.working_hours || ''} onChange={(e) => setSupportDraft({ ...supportDraft, working_hours: e.target.value })} placeholder="Pon – Pet 08–17h" disabled={busy} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Web stranica</Label>
                  <Input type="url" value={supportDraft.website || ''} onChange={(e) => setSupportDraft({ ...supportDraft, website: e.target.value })} placeholder="https://..." disabled={busy} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={cancelSupportForm} disabled={busy}>
                  Odustani
                </Button>
                <Button type="button" size="sm" onClick={saveSupport} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Spremi'}
                </Button>
              </div>
            </div>
          ) : (
            !supportContact && (
              <Button type="button" variant="outline" size="sm" onClick={startNewSupport} disabled={busy}>
                <Plus className="h-4 w-4 mr-1" />
                Dodaj kontakt podrške
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
