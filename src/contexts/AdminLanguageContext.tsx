import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type AdminLang = 'hr' | 'en';

const STORAGE_KEY = 'conwayo_admin_lang';

const translations = {
  // Sidebar nav
  'nav.dashboard': { hr: 'Dashboard', en: 'Dashboard' },
  'nav.events': { hr: 'Događaji', en: 'Events' },
  'nav.adminPanel': { hr: 'Admin Panel', en: 'Admin Panel' },
  'nav.whatsappInspector': { hr: 'WhatsApp Inspector', en: 'WhatsApp Inspector' },
  'nav.signOut': { hr: 'Odjava', en: 'Sign Out' },
  'nav.settings': { hr: 'Postavke', en: 'Profile & Settings' },

  // Dashboard
  'dashboard.welcome': { hr: 'Dobrodošli natrag', en: 'Welcome back' },
  'dashboard.subtitle': { hr: 'Evo što se događa s vašim događajima danas.', en: "Here's what's happening with your events today." },
  'dashboard.createEvent': { hr: 'Stvori događaj', en: 'Create Event' },
  'dashboard.viewingEvent': { hr: 'Pregled događaja', en: 'Viewing Event' },
  'dashboard.allEvents': { hr: 'Svi događaji', en: 'All Events' },
  'dashboard.selectEvent': { hr: 'Odaberi događaj', en: 'Select an event' },
  'dashboard.viewDetails': { hr: 'Detalji →', en: 'View Details →' },
  'dashboard.managing': { hr: 'Upravljanje', en: 'Managing' },
  'dashboard.financialOverview': { hr: 'Financijski pregled platforme', en: 'Platform Financial Overview' },
  'dashboard.financialOverviewOrg': { hr: 'Financijski pregled', en: 'Financial Overview' },
  'dashboard.ticketRevenue': { hr: 'Prihod od ulaznica', en: 'Ticket Revenue' },
  'dashboard.addonRevenue': { hr: 'Prihod od dodataka', en: 'Add-on Revenue' },
  'dashboard.totalPaidRevenue': { hr: 'Ukupni plaćeni prihod', en: 'Total Paid Revenue' },
  'dashboard.confirmed': { hr: 'Potvrđeno', en: 'Confirmed' },
  'dashboard.pending': { hr: 'Na čekanju', en: 'Pending' },
  'dashboard.paid': { hr: 'Plaćeno', en: 'Paid' },
  'dashboard.revenueBreakdown': { hr: 'Pregled prihoda', en: 'Revenue Breakdown' },
  'dashboard.total': { hr: 'Ukupno', en: 'Total' },
  'dashboard.tickets': { hr: 'Ulaznice', en: 'Tickets' },
  'dashboard.addons': { hr: 'Dodaci', en: 'Add-ons' },
  'dashboard.totalAttendees': { hr: 'Ukupno polaznika', en: 'Total Attendees' },
  'dashboard.pendingIncome': { hr: 'Prihod na čekanju', en: 'Pending Income' },
  'dashboard.awaitingPayment': { hr: 'Čeka uplatu', en: 'Awaiting payment' },
  'dashboard.acrossAllEvents': { hr: 'Kroz sve događaje', en: 'Across all events' },
  'dashboard.registeredUsers': { hr: 'Registrirani korisnici', en: 'Registered users' },
  'dashboard.recentEvents': { hr: 'Nedavni događaji', en: 'Recent Events' },
  'dashboard.recentEventsSub': { hr: 'Vaši najnoviji stvoreni događaji', en: 'Your latest created events' },
  'dashboard.noEvents': { hr: 'Još nema događaja', en: 'No events yet' },
  'dashboard.noRevenue': { hr: 'Još nema podataka o prihodima', en: 'No revenue data yet' },
  'dashboard.noRevenueSub': { hr: 'Prihodi će se prikazati nakon uplata', en: 'Revenue will appear here once payments are received' },

  // Events
  'events.title': { hr: 'Događaji', en: 'Events' },
  'events.new': { hr: 'Novi događaj', en: 'New Event' },
  'events.search': { hr: 'Pretraži događaje...', en: 'Search events...' },
  'events.noEvents': { hr: 'Nema događaja', en: 'No events found' },
  'events.attendees': { hr: 'polaznika', en: 'attendees' },
  'events.edit': { hr: 'Uredi', en: 'Edit' },
  'events.delete': { hr: 'Obriši', en: 'Delete' },
  'events.active': { hr: 'Aktivan', en: 'Active' },
  'events.draft': { hr: 'Nacrt', en: 'Draft' },
  'events.test': { hr: 'Test', en: 'Test' },
  'events.archived': { hr: 'Arhiviran', en: 'Archived' },

  // Common
  'common.save': { hr: 'Spremi', en: 'Save' },
  'common.cancel': { hr: 'Odustani', en: 'Cancel' },
  'common.delete': { hr: 'Obriši', en: 'Delete' },
  'common.edit': { hr: 'Uredi', en: 'Edit' },
  'common.loading': { hr: 'Učitavanje...', en: 'Loading...' },
  'common.error': { hr: 'Greška', en: 'Error' },
  'common.success': { hr: 'Uspješno', en: 'Success' },
  'common.confirm': { hr: 'Potvrdi', en: 'Confirm' },
  'common.search': { hr: 'Pretraži', en: 'Search' },
  'common.noResults': { hr: 'Nema rezultata', en: 'No results' },
  'common.status': { hr: 'Status', en: 'Status' },
  'common.name': { hr: 'Naziv', en: 'Name' },
  'common.email': { hr: 'Email', en: 'Email' },
  'common.phone': { hr: 'Telefon', en: 'Phone' },
  'common.actions': { hr: 'Akcije', en: 'Actions' },
  'common.close': { hr: 'Zatvori', en: 'Close' },
  'common.back': { hr: 'Natrag', en: 'Back' },
} as const;

type TranslationKey = keyof typeof translations;

interface AdminLanguageContextType {
  lang: AdminLang;
  setLang: (l: AdminLang) => void;
  t: (key: TranslationKey) => string;
}

const AdminLanguageContext = createContext<AdminLanguageContextType | null>(null);

export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'hr') return saved;
    } catch {}
    return 'hr';
  });

  const setLang = useCallback((l: AdminLang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry['hr'] ?? key;
  }, [lang]);

  return (
    <AdminLanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  const ctx = useContext(AdminLanguageContext);
  if (!ctx) throw new Error('useAdminLanguage must be used within AdminLanguageProvider');
  return ctx;
}
