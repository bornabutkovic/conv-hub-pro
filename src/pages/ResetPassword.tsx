import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Lozinka mora imati najmanje 8 znakova');
const emailSchema = z.string().email('Unesite važeću email adresu');

export default function ResetPassword() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Set-password form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Request-new-link state
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message || 'Greška pri postavljanju lozinke');
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/', { replace: true }), 2000);
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setRequestError(result.error.errors[0].message);
      return;
    }

    setRequesting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setRequesting(false);

    if (resetError) {
      setRequestError(resetError.message || 'Greška pri slanju linka');
      return;
    }
    setRequestSent(true);
  };

  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl rounded-2xl">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Lozinka uspješno postavljena</CardTitle>
            <CardDescription>Preusmjeravamo vas na nadzornu ploču...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Scenario B: no valid session — request new link
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl rounded-2xl">
          <CardHeader className="text-center">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-primary">Conwayo</h1>
            </div>
            <CardTitle className="text-2xl">Link je istekao ili nije važeći</CardTitle>
            <CardDescription>
              Unesite svoju email adresu kako bismo vam poslali novi link za postavljanje lozinke.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requestSent ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Provjerite svoj email — poslali smo vam novi link za postavljanje lozinke.
                </p>
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => navigate('/auth', { replace: true })}
                >
                  Natrag na prijavu
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestNewLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {requestError && (
                  <p className="text-sm font-medium text-destructive">{requestError}</p>
                )}
                <Button type="submit" className="w-full rounded-xl" disabled={requesting}>
                  {requesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Šaljem...
                    </>
                  ) : (
                    'Zatraži novi link'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scenario A: active session — set password
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-primary">Conwayo</h1>
          </div>
          <CardTitle className="text-2xl">Postavite svoju lozinku</CardTitle>
          <CardDescription>
            Kreirajte sigurnu lozinku za svoj račun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova lozinka</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">Najmanje 8 znakova</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Ponovite lozinku</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Spremam...
                </>
              ) : (
                'Spremi lozinku'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
