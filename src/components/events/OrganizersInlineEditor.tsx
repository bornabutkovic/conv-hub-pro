import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Building2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export interface OrganizerEntry {
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  phone?: string;
}

export interface OrganizersInfo {
  co_organizers: OrganizerEntry[];
  technical_organizer: OrganizerEntry | null;
}

interface Props {
  value: OrganizersInfo;
  onChange: (next: OrganizersInfo) => void;
}

const emptyDraft = (): OrganizerEntry => ({
  name: '',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  website: '',
  phone: '',
});

const cleanEntry = (e: OrganizerEntry): OrganizerEntry => {
  const out: OrganizerEntry = { name: e.name.trim() };
  (['address', 'city', 'postal_code', 'country', 'website', 'phone'] as const).forEach((k) => {
    const v = (e[k] || '').trim();
    if (v) (out as any)[k] = v;
  });
  return out;
};

export function OrganizersInlineEditor({ value, onChange }: Props) {
  const coOrganizers = value.co_organizers || [];
  const technicalOrganizer = value.technical_organizer || null;

  const [coEditIdx, setCoEditIdx] = useState<number | null>(null);
  const [coDraft, setCoDraft] = useState<OrganizerEntry>(emptyDraft());

  const [showTechForm, setShowTechForm] = useState(false);
  const [techDraft, setTechDraft] = useState<OrganizerEntry>(emptyDraft());

  const saveCoOrganizer = () => {
    if (!coDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    const entry = cleanEntry(coDraft);
    let nextList: OrganizerEntry[];
    if (coEditIdx === -1 || coEditIdx === null) {
      nextList = [...coOrganizers, entry];
    } else {
      nextList = coOrganizers.map((o, i) => (i === coEditIdx ? entry : o));
    }
    onChange({ ...value, co_organizers: nextList });
    setCoDraft(emptyDraft());
    setCoEditIdx(null);
  };

  const removeCoOrganizer = (index: number) => {
    onChange({ ...value, co_organizers: coOrganizers.filter((_, i) => i !== index) });
    if (coEditIdx === index) {
      setCoEditIdx(null);
      setCoDraft(emptyDraft());
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

  const saveTechnical = () => {
    if (!techDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    onChange({ ...value, technical_organizer: cleanEntry(techDraft) });
    setTechDraft(emptyDraft());
    setShowTechForm(false);
  };

  const removeTechnical = () => {
    onChange({ ...value, technical_organizer: null });
    setShowTechForm(false);
    setTechDraft(emptyDraft());
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
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
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
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Adresa</Label>
          <Input
            value={draft.address || ''}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Ulica i kućni broj"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Grad</Label>
          <Input
            value={draft.city || ''}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            placeholder="Zagreb"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Poštanski broj</Label>
          <Input
            value={draft.postal_code || ''}
            onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })}
            placeholder="10000"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Država</Label>
          <Input
            value={draft.country || ''}
            onChange={(e) => setDraft({ ...draft, country: e.target.value })}
            placeholder="Hrvatska"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Telefon</Label>
          <Input
            value={draft.phone || ''}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="+385..."
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Website</Label>
          <Input
            value={draft.website || ''}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Odustani
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!draft.name.trim()}>
          {saveLabel}
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
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Suorganizatori</h4>
          {coOrganizers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nema suorganizatora</p>
          ) : (
            <div className="space-y-2">
              {coOrganizers.map((org, idx) => (
                <div key={idx}>
                  {renderEntryRow(org, () => startEditCo(idx), () => removeCoOrganizer(idx))}
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
            <Button type="button" variant="outline" size="sm" onClick={startNewCo}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj suorganizatora
            </Button>
          )}
        </div>

        <Separator />

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
              <Button type="button" variant="outline" size="sm" onClick={startNewTech}>
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
