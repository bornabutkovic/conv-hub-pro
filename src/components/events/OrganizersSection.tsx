import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Building2, Loader2, Plus, ExternalLink } from 'lucide-react';

interface OrganizerEntry {
  name: string;
  website_url?: string;
  logo_url?: string;
}

interface OrganizersInfo {
  co_organizers?: OrganizerEntry[];
  technical_organizer?: OrganizerEntry | null;
}

interface OrganizersSectionProps {
  eventId: string;
}

export function OrganizersSection({ eventId }: OrganizersSectionProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [showCoForm, setShowCoForm] = useState(false);
  const [showTechForm, setShowTechForm] = useState(false);
  const [coDraft, setCoDraft] = useState<OrganizerEntry>({ name: '', website_url: '', logo_url: '' });
  const [techDraft, setTechDraft] = useState<OrganizerEntry>({ name: '', website_url: '', logo_url: '' });

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

  const addCoOrganizer = async () => {
    if (!coDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    setBusy(true);
    try {
      const entry: OrganizerEntry = {
        name: coDraft.name.trim(),
        ...(coDraft.website_url?.trim() ? { website_url: coDraft.website_url.trim() } : {}),
        ...(coDraft.logo_url?.trim() ? { logo_url: coDraft.logo_url.trim() } : {}),
      };
      const next: OrganizersInfo = {
        ...info,
        co_organizers: [...coOrganizers, entry],
      };
      await persist(next);
      toast.success('Suorganizator dodan');
      setCoDraft({ name: '', website_url: '', logo_url: '' });
      setShowCoForm(false);
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
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const setTechnical = async () => {
    if (!techDraft.name.trim()) {
      toast.error('Naziv je obavezan');
      return;
    }
    setBusy(true);
    try {
      const entry: OrganizerEntry = {
        name: techDraft.name.trim(),
        ...(techDraft.website_url?.trim() ? { website_url: techDraft.website_url.trim() } : {}),
        ...(techDraft.logo_url?.trim() ? { logo_url: techDraft.logo_url.trim() } : {}),
      };
      const next: OrganizersInfo = { ...info, technical_organizer: entry };
      await persist(next);
      toast.success('Tehnički organizator postavljen');
      setTechDraft({ name: '', website_url: '', logo_url: '' });
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
      const next: OrganizersInfo = { ...info, technical_organizer: null };
      await persist(next);
      toast.success('Tehnički organizator uklonjen');
    } catch (err: any) {
      toast.error(err.message || 'Greška pri uklanjanju');
    } finally {
      setBusy(false);
    }
  };

  const renderEntryRow = (entry: OrganizerEntry, onRemove: () => void) => (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate font-medium">{entry.name}</span>
        {entry.website_url ? (
          <a
            href={entry.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{entry.website_url}</span>
          </a>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={busy}
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
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
      <div className="space-y-1.5">
        <Label className="text-xs">Website (opcionalno)</Label>
        <Input
          value={draft.website_url || ''}
          onChange={(e) => setDraft({ ...draft, website_url: e.target.value })}
          placeholder="https://..."
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Logo URL (opcionalno)</Label>
        <Input
          value={draft.logo_url || ''}
          onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
          placeholder="https://..."
          disabled={busy}
        />
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
                <div key={idx}>{renderEntryRow(org, () => removeCoOrganizer(idx))}</div>
              ))}
            </div>
          )}

          {showCoForm ? (
            renderInlineForm(
              coDraft,
              setCoDraft,
              addCoOrganizer,
              () => {
                setShowCoForm(false);
                setCoDraft({ name: '', website_url: '', logo_url: '' });
              },
              'Spremi'
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCoForm(true)}
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
            renderEntryRow(technicalOrganizer, removeTechnical)
          ) : (
            <p className="text-sm text-muted-foreground">Nema tehničkog organizatora</p>
          )}

          {!technicalOrganizer && (
            showTechForm ? (
              renderInlineForm(
                techDraft,
                setTechDraft,
                setTechnical,
                () => {
                  setShowTechForm(false);
                  setTechDraft({ name: '', website_url: '', logo_url: '' });
                },
                'Postavi'
              )
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTechForm(true)}
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
