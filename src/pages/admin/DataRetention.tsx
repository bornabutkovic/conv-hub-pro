import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';

interface RetentionResult {
  chat_deleted?: number;
  wa_sessions_deleted?: number;
  voice_sessions_deleted?: number;
  attendees_anonymized?: number;
  profiles_anonymized?: number;
}

interface AuditRow {
  id: string;
  executed_at: string;
  chat_deleted: number;
  wa_sessions_deleted: number;
  voice_sessions_deleted: number;
  attendees_anonymized: number;
  profiles_anonymized: number;
}

export default function DataRetention() {
  const { profile, profileLoading } = useAuth();
  const [preview, setPreview] = useState<RetentionResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<AuditRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    const { data, error } = await (supabase.rpc as any)('run_data_retention_cleanup', {
      dry_run: true,
    });
    setLoadingPreview(false);
    if (error) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
      return;
    }
    setPreview((data as RetentionResult) ?? {});
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await (supabase as any)
      .from('retention_audit_log')
      .select('*')
      .order('executed_at', { ascending: false });
    setLoadingHistory(false);
    if (error) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
      return;
    }
    setHistory((data as AuditRow[]) ?? []);
  };

  const runCleanup = async () => {
    setRunning(true);
    const { data, error } = await (supabase.rpc as any)('run_data_retention_cleanup', {
      dry_run: false,
    });
    setRunning(false);
    if (error) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
      return;
    }
    const r = (data as RetentionResult) ?? {};
    toast({
      title: 'Čišćenje izvršeno',
      description: `Obrisano/anonimizirano: ${
        (r.chat_deleted ?? 0) +
        (r.wa_sessions_deleted ?? 0) +
        (r.voice_sessions_deleted ?? 0) +
        (r.attendees_anonymized ?? 0) +
        (r.profiles_anonymized ?? 0)
      } zapisa.`,
    });
    fetchPreview();
    fetchHistory();
  };

  useEffect(() => {
    fetchPreview();
    fetchHistory();
  }, []);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin(profile?.role)) {
    return <Navigate to="/admin" replace />;
  }

  const totalAffected =
    (preview?.chat_deleted ?? 0) +
    (preview?.wa_sessions_deleted ?? 0) +
    (preview?.voice_sessions_deleted ?? 0) +
    (preview?.attendees_anonymized ?? 0) +
    (preview?.profiles_anonymized ?? 0);

  const rows: Array<{ label: string; value: number }> = [
    { label: 'Poruke za brisanje (chat_messages)', value: preview?.chat_deleted ?? 0 },
    { label: 'WhatsApp sesije za brisanje', value: preview?.wa_sessions_deleted ?? 0 },
    { label: 'Voice sesije za brisanje', value: preview?.voice_sessions_deleted ?? 0 },
    { label: 'Sudionici za anonimizaciju', value: preview?.attendees_anonymized ?? 0 },
    { label: 'Profili za anonimizaciju', value: preview?.profiles_anonymized ?? 0 },
  ];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upravljanje podacima (GDPR)</h1>
        <p className="text-muted-foreground mt-1">
          Pregled i izvođenje politike zadržavanja podataka.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pregled (dry run)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingPreview ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Učitavanje...
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.label} className="flex justify-between border-b pb-2 last:border-0">
                  <span className="text-sm">{r.label}</span>
                  <span className="font-semibold tabular-nums">{r.value}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={fetchPreview} disabled={loadingPreview}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Osvježi pregled
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={running || loadingPreview}>
                  {running ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Pokreni čišćenje
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Potvrda čišćenja</AlertDialogTitle>
                  <AlertDialogDescription>
                    Jeste li sigurni? Ova radnja je nepovratna. Bit će obrisano/anonimizirano{' '}
                    {totalAffected} zapisa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Odustani</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runCleanup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Potvrdi i pokreni
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Povijest izvođenja</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Učitavanje...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nema zabilježenih izvođenja.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum izvođenja</TableHead>
                  <TableHead className="text-right">Chat poruke</TableHead>
                  <TableHead className="text-right">WA sesije</TableHead>
                  <TableHead className="text-right">Voice sesije</TableHead>
                  <TableHead className="text-right">Sudionici</TableHead>
                  <TableHead className="text-right">Profili</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.executed_at).toLocaleString('hr-HR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.chat_deleted}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.wa_sessions_deleted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.voice_sessions_deleted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.attendees_anonymized}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.profiles_anonymized}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
