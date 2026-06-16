import { useState, useRef } from 'react';
import { Upload, Loader2, FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface MatchedOrder {
  date: string;
  debtor: string;
  amount: number;
  quote_number?: string;
  order_id?: string;
  amount_match: boolean;
}

interface UnmatchedTx {
  date: string;
  debtor: string;
  amount: number;
  reference?: string;
  description?: string;
}

interface AlreadyPaid {
  date: string;
  debtor: string;
  amount: number;
  bc_quote_number?: string;
  order_number?: string;
}

interface ProcessResult {
  dry_run: boolean;
  total: number;
  matched: MatchedOrder[];
  unmatched: UnmatchedTx[];
  already_paid: AlreadyPaid[];
}

export default function BankStatement() {
  
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xml')) {
      setError('Please select an XML file.');
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!file || !session?.access_token) return;
    setProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dry_run', dryRun ? 'true' : 'false');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-bank-statement`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
      setResult(data as ProcessResult);
    } catch (e: any) {
      setError(e.message || 'Failed to process statement.');
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setDryRun(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bank Statement Reconciliation</h1>
        <p className="text-muted-foreground mt-1">
          Upload a CAMT.053 XML bank statement to automatically match payments to orders.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload statement</CardTitle>
            <CardDescription>CAMT.053 XML format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0] || null);
              }}
              className={`cursor-pointer border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center gap-3 transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Drop CAMT.053 XML file here or click to browse'}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
              <span className="text-sm">Dry run (preview only — do not mark orders as paid)</span>
            </label>

            <Button onClick={handleSubmit} disabled={!file || processing} className="w-full">
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                'Process Statement'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total entries</p>
                <p className="text-2xl font-bold">{result.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
              <CardContent className="p-4">
                <p className="text-xs text-green-700 dark:text-green-400">Matched & paid</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.matched.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
              <CardContent className="p-4">
                <p className="text-xs text-red-700 dark:text-red-400">Unmatched</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.unmatched.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4">
                <p className="text-xs text-blue-700 dark:text-blue-400">Already paid</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.already_paid.length}</p>
              </CardContent>
            </Card>
          </div>

          {result.dry_run && (
            <Alert className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-900 text-yellow-900 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Dry run — no orders were updated. Uncheck dry run and re-upload to apply changes.
              </AlertDescription>
            </Alert>
          )}

          {result.matched.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Matched Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Debtor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Quote Number</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Amount Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.matched.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{m.date}</TableCell>
                        <TableCell>{m.debtor}</TableCell>
                        <TableCell>{fmt(m.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">{m.quote_number || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{m.order_id || '—'}</TableCell>
                        <TableCell>
                          {m.amount_match ? (
                            <Badge className="bg-green-600 hover:bg-green-700">✓ Exact</Badge>
                          ) : (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600">≈ Diff</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {result.unmatched.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Unmatched Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Debtor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.unmatched.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell>{u.date}</TableCell>
                        <TableCell>{u.debtor}</TableCell>
                        <TableCell>{fmt(u.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">{u.reference || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.description || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {result.already_paid.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <Info className="h-5 w-5" /> Already Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Debtor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Quote Number</TableHead>
                      <TableHead>Order #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.already_paid.map((ap, i) => (
                      <TableRow key={i}>
                        <TableCell>{ap.date}</TableCell>
                        <TableCell>{ap.debtor}</TableCell>
                        <TableCell>{fmt(ap.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">{ap.bc_quote_number || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{ap.order_number || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={reset}>
            Upload another file
          </Button>
        </div>
      )}
    </div>
  );
}
