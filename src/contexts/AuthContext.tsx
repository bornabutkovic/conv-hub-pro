import { createContext, useContext, useEffect, useState, useRef, type ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  institution_uuid: string | null;
  role: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Track the latest fetch to avoid stale/duplicate results
  const fetchIdRef = useRef(0);
  const initialised = useRef(false);
  // Prati čiji je profil trenutno učitan — razlikuje pravi login/logout
  // od Supabase auto-refresh eventa za ISTOG usera (npr. tab dobije fokus).
  const currentUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, opts?: { silent?: boolean }) => {
    const id = ++fetchIdRef.current;
    if (!opts?.silent) setProfileLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone, institution_uuid, role')
      .eq('id', userId)
      .single();

    // Only apply if this is still the latest request
    if (id !== fetchIdRef.current) return;

    if (error) {
      console.error('Error fetching profile:', error);
      if (!opts?.silent) setProfile(null);
    } else {
      setProfile(data);
    }
    if (!opts?.silent) setProfileLoading(false);
  }, []);

  const handleSession = useCallback((s: Session | null) => {
    const newUserId = s?.user?.id ?? null;
    const isSameUser = newUserId !== null && newUserId === currentUserIdRef.current;

    setSession(s);
    setUser(s?.user ?? null);

    if (s?.user) {
      currentUserIdRef.current = newUserId;

      if (isSameUser) {
        // Isti korisnik, event je gotovo sigurno token refresh (tab focus).
        // Profil se refresha tiho, BEZ diranja profileLoading — inače
        // ProtectedRoute/AdminRoute unmountaju djecu i brišu forme.
        fetchProfile(s.user.id, { silent: true });
        return;
      }

      // Stvarni novi login za drugog korisnika — očisti stari profil prvo
      // da guardovi nikad ne djeluju na stare podatke.
      setProfile(null);
      setProfileLoading(true);
      fetchProfile(s.user.id);
    } else {
      currentUserIdRef.current = null;
      setProfile(null);
      setProfileLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    // 1. Subscribe to auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        // Skip the first INITIAL_SESSION event — we handle it via getSession below
        if (!initialised.current) return;
        handleSession(s);
      }
    );

    // 2. Seed with current session (runs once)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      handleSession(s);
      setLoading(false);
      initialised.current = true;
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    fetchIdRef.current++; // Invalidate any in-flight fetches
    currentUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
