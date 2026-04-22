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
  'dashboard.registrations': { hr: 'Registracije', en: 'Registrations' },
  'dashboard.checkedIn': { hr: 'Prijavljeni', en: 'Checked In' },
  'dashboard.conversionRate': { hr: 'Stopa konverzije', en: 'Conversion Rate' },
  'dashboard.recentActivity': { hr: 'Nedavna aktivnost', en: 'Recent Activity' },
  'dashboard.noActivity': { hr: 'Nema nedavne aktivnosti', en: 'No recent activity' },
  'dashboard.paymentMethods': { hr: 'Načini plaćanja', en: 'Payment Methods' },
  'dashboard.stripe': { hr: 'Kartica', en: 'Card' },
  'dashboard.invoice': { hr: 'Faktura', en: 'Invoice' },
  'dashboard.topEvents': { hr: 'Najpopularniji događaji', en: 'Top Events' },
  'dashboard.noData': { hr: 'Nema podataka', en: 'No data' },

  // Events
  'events.title': { hr: 'Događaji', en: 'Events' },
  'events.subtitle': { hr: 'Upravljajte svim događajima na jednom mjestu', en: 'Manage all your events in one place' },
  'events.createEvent': { hr: '+ Stvori događaj', en: '+ Create Event' },
  'events.new': { hr: 'Novi događaj', en: 'New Event' },
  'events.search': { hr: 'Pretraži događaje...', en: 'Search events...' },
  'events.filterAll': { hr: 'Svi', en: 'All' },
  'events.filterDraft': { hr: 'Nacrt', en: 'Draft' },
  'events.filterPendingApproval': { hr: 'Čeka odobrenje', en: 'Pending Approval' },
  'events.filterActive': { hr: 'Aktivni', en: 'Active' },
  'events.filterTest': { hr: 'Test', en: 'Test' },
  'events.filterCompleted': { hr: 'Završeni', en: 'Completed' },
  'events.filterArchived': { hr: 'Arhivirani', en: 'Archived' },
  'events.sortNewest': { hr: 'Datum (najnoviji)', en: 'Date (newest)' },
  'events.sortOldest': { hr: 'Datum (najstariji)', en: 'Date (oldest)' },
  'events.sortName': { hr: 'Naziv', en: 'Name' },
  'events.noEvents': { hr: 'Nema događaja', en: 'No events found' },
  'events.noEventsSubtitle': { hr: 'Stvorite svoj prvi događaj', en: 'Create your first event' },
  'events.attendees': { hr: 'polaznika', en: 'attendees' },
  'events.edit': { hr: 'Uredi', en: 'Edit' },
  'events.delete': { hr: 'Obriši', en: 'Delete' },
  'events.active': { hr: 'Aktivan', en: 'Active' },
  'events.draft': { hr: 'Nacrt', en: 'Draft' },
  'events.test': { hr: 'Test', en: 'Test' },
  'events.archived': { hr: 'Arhiviran', en: 'Archived' },

  // EventCard
  'eventCard.revenue': { hr: 'Prihod', en: 'Revenue' },
  'eventCard.pending': { hr: 'Na čekanju', en: 'Pending' },
  'eventCard.attendees': { hr: 'polaznika', en: 'attendees' },
  'eventCard.edit': { hr: 'Uredi', en: 'Edit' },
  'eventCard.delete': { hr: 'Obriši', en: 'Delete' },
  'eventCard.viewDetails': { hr: 'Detalji', en: 'Details' },

  // Status badges
  'status.active': { hr: 'Aktivan', en: 'Active' },
  'status.draft': { hr: 'Nacrt', en: 'Draft' },
  'status.test': { hr: 'Test', en: 'Test' },
  'status.completed': { hr: 'Završen', en: 'Completed' },
  'status.archived': { hr: 'Arhiviran', en: 'Archived' },
  'status.pendingApproval': { hr: 'Čeka odobrenje', en: 'Pending Approval' },
  'status.rejected': { hr: 'Odbijen', en: 'Rejected' },
  'status.upcoming': { hr: 'Uskoro', en: 'Upcoming' },
  'status.expired': { hr: 'Isteklo', en: 'Expired' },
  'status.noDates': { hr: 'Datumi nisu postavljeni', en: 'No dates set' },

  // Event Details
  'eventDetails.backToEvents': { hr: 'Natrag na događaje', en: 'Back to Events' },
  'eventDetails.edit': { hr: 'Uredi događaj', en: 'Edit Event' },
  'eventDetails.delete': { hr: 'Obriši događaj', en: 'Delete Event' },
  'eventDetails.preview': { hr: 'Pregled', en: 'Preview' },
  'eventDetails.attendees': { hr: 'Polaznici', en: 'Attendees' },
  'eventDetails.tickets': { hr: 'Ulaznice', en: 'Tickets' },
  'eventDetails.ticketTiers': { hr: 'Cjenovni razredi', en: 'Ticket Tiers' },
  'eventDetails.services': { hr: 'Usluge', en: 'Services' },
  'eventDetails.approvals': { hr: 'Odobrenja', en: 'Approvals' },
  'eventDetails.overview': { hr: 'Pregled', en: 'Overview' },
  'eventDetails.addAttendee': { hr: 'Dodaj polaznika', en: 'Add Attendee' },
  'eventDetails.exportCsv': { hr: 'Izvezi CSV', en: 'Export CSV' },
  'eventDetails.totalRevenue': { hr: 'Ukupni prihod', en: 'Total Revenue' },
  'eventDetails.totalAttendees': { hr: 'Ukupno polaznika', en: 'Total Attendees' },
  'eventDetails.checkedIn': { hr: 'Prijavljeni', en: 'Checked In' },
  'eventDetails.pending': { hr: 'Na čekanju', en: 'Pending' },
  'eventDetails.paid': { hr: 'Plaćeno', en: 'Paid' },
  'eventDetails.registrations': { hr: 'registracija', en: 'registrations' },
  'eventDetails.registeredFor': { hr: 'Registrirani za ovaj događaj', en: 'Registered for this event' },
  'eventDetails.noAttendees': { hr: 'Nema polaznika', en: 'No attendees yet' },
  'eventDetails.searchAttendees': { hr: 'Pretraži polaznike...', en: 'Search attendees...' },
  'eventDetails.status': { hr: 'Status', en: 'Status' },
  'eventDetails.submitForReview': { hr: 'Pošalji na pregled', en: 'Submit for Review' },
  'eventDetails.approve': { hr: 'Odobri', en: 'Approve' },
  'eventDetails.eventNotFound': { hr: 'Događaj nije pronađen.', en: 'Event not found.' },
  'eventDetails.actionRequired': { hr: 'Potrebna akcija – razlog admina:', en: 'Action required – reason from admin:' },
  'eventDetails.dangerZone': { hr: 'Opasna zona', en: 'Danger Zone' },
  'eventDetails.archiveDescription': { hr: 'Arhivirajte ovaj događaj kako biste ga sakrili od organizatora i polaznika.', en: 'Archive this event to hide it from organizers and attendees.' },

  // Attendees table
  'attendeeTable.title': { hr: 'Polaznici', en: 'Attendees' },
  'attendeeTable.subtitle': { hr: 'Upravljajte registracijama događaja', en: 'Manage event registrations' },
  'attendeeTable.fullName': { hr: 'Ime i prezime', en: 'Full Name' },
  'attendeeTable.name': { hr: 'Ime i prezime', en: 'Name' },
  'attendeeTable.email': { hr: 'Email', en: 'Email' },
  'attendeeTable.noEmail': { hr: 'Nema emaila', en: 'No email' },
  'attendeeTable.ticket': { hr: 'Ulaznica', en: 'Ticket' },
  'attendeeTable.payment': { hr: 'Plaćanje', en: 'Payment' },
  'attendeeTable.invoiceNumber': { hr: 'Br. ponude', en: 'Invoice #' },
  'attendeeTable.orderNumber': { hr: 'Narudžba #', en: 'Order #' },
  'attendeeTable.checkin': { hr: 'Prijava', en: 'Check-in' },
  'attendeeTable.checkedIn': { hr: 'Prijavljen', en: 'Checked In' },
  'attendeeTable.notCheckedIn': { hr: 'Nije prijavljen', en: 'Not checked in' },
  'attendeeTable.registrationDate': { hr: 'Datum registracije', en: 'Registration Date' },
  'attendeeTable.status': { hr: 'Status', en: 'Status' },
  'attendeeTable.actions': { hr: 'Akcije', en: 'Actions' },
  'attendeeTable.paid': { hr: 'Plaćeno', en: 'Paid' },
  'attendeeTable.unpaid': { hr: 'Neplaćeno', en: 'Unpaid' },
  'attendeeTable.pending': { hr: 'Na čekanju', en: 'Pending' },
  'attendeeTable.overdue': { hr: 'Kasni', en: 'Overdue' },
  'attendeeTable.all': { hr: 'Svi', en: 'All' },
  'attendeeTable.yes': { hr: 'Da', en: 'Yes' },
  'attendeeTable.no': { hr: 'Ne', en: 'No' },
  'attendeeTable.registered': { hr: 'Registriran', en: 'Registered' },
  'attendeeTable.cancelled': { hr: 'Otkazan', en: 'Cancelled' },
  'attendeeTable.group': { hr: 'Grupna', en: 'Group' },
  'attendeeTable.searchInvoice': { hr: 'Pretraži br. ponude...', en: 'Search invoice #...' },
  'attendeeTable.addAttendee': { hr: 'Dodaj polaznika ručno', en: 'Add Attendee Manually' },
  'attendeeTable.addFirst': { hr: 'Dodaj prvog polaznika', en: 'Add First Attendee' },
  'attendeeTable.noRegistrations': { hr: 'Još nema registracija', en: 'No registrations yet' },
  'attendeeTable.noRegistrationsDesc': { hr: 'Dodajte polaznike ručno ili pričekajte WhatsApp registracije.', en: 'Add attendees manually or wait for WhatsApp registrations.' },
  'attendeeTable.copied': { hr: 'Kopirano u međuspremnik', en: 'Copied to clipboard' },
  'attendeeTable.clickToCopy': { hr: 'Klikni za kopiranje', en: 'Click to copy' },
  'attendeeTable.deleteAttendee': { hr: 'Obriši polaznika', en: 'Delete Attendee' },
  'attendeeTable.confirmDelete': { hr: 'Jeste li sigurni?', en: 'Are you sure?' },
  'attendeeTable.confirmDeleteDesc': { hr: 'Ova akcija je nepovratna.', en: 'This action cannot be undone.' },
  'attendeeTable.cancel': { hr: 'Odustani', en: 'Cancel' },
  'attendeeTable.confirm': { hr: 'Potvrdi', en: 'Confirm' },

  // Ticket tiers table
  'ticketTiers.title': { hr: 'Cjenovni razredi', en: 'Ticket Tiers' },
  'ticketTiers.name': { hr: 'Naziv', en: 'Name' },
  'ticketTiers.price': { hr: 'Cijena', en: 'Price' },
  'ticketTiers.capacity': { hr: 'Kapacitet', en: 'Capacity' },
  'ticketTiers.unlimited': { hr: 'Neograničeno', en: 'Unlimited' },
  'ticketTiers.salesPeriod': { hr: 'Razdoblje prodaje', en: 'Sales Period' },
  'ticketTiers.notSet': { hr: 'Nije postavljeno', en: 'Not set' },
  'ticketTiers.open': { hr: 'Otvoreno', en: 'Open' },
  'ticketTiers.ongoing': { hr: 'U tijeku', en: 'Ongoing' },
  'ticketTiers.status': { hr: 'Status', en: 'Status' },
  'ticketTiers.erpCode': { hr: 'ERP kod', en: 'ERP Code' },
  'ticketTiers.erpPlaceholder': { hr: 'ERP kod', en: 'ERP code' },
  'ticketTiers.missingErp': { hr: 'Nedostaje ERP kod', en: 'Missing ERP Code' },
  'ticketTiers.actions': { hr: 'Akcije', en: 'Actions' },
  'ticketTiers.sold': { hr: 'Prodano', en: 'Sold' },
  'ticketTiers.addTier': { hr: 'Dodaj razred', en: 'Add Tier' },
  'ticketTiers.addTicketTier': { hr: 'Dodaj cjenovni razred', en: 'Add Ticket Tier' },
  'ticketTiers.deleteTier': { hr: 'Obriši cjenovni razred', en: 'Delete Ticket Tier' },
  'ticketTiers.deleteConfirm': { hr: 'Jeste li sigurni da želite obrisati ovaj cjenovni razred? Ova akcija je nepovratna.', en: 'Are you sure you want to delete this ticket tier? This action cannot be undone.' },
  'ticketTiers.delete': { hr: 'Obriši', en: 'Delete' },
  'ticketTiers.cancel': { hr: 'Odustani', en: 'Cancel' },
  'ticketTiers.noTiers': { hr: 'Još nema konfiguriranih cjenovnih razreda.', en: 'No ticket tiers configured yet.' },
  'ticketTiers.noTiersSub': { hr: 'Dodajte svoj prvi cjenovni razred za početak prodaje.', en: 'Add your first ticket tier to start selling.' },
  'ticketTiers.translate': { hr: 'Prevedi na engleski', en: 'Translate to English' },
  'ticketTiers.translationUpdated': { hr: 'Prijevod ažuriran', en: 'Translation updated' },
  'ticketTiers.translationFailed': { hr: 'Prijevod neuspješan', en: 'Translation failed' },
  'ticketTiers.lockedTooltip': { hr: 'Ne možete uređivati naziv/cijenu — ulaznice su već prodane. Možete promijeniti kapacitet ili završiti prodaju ranije.', en: 'Cannot edit name/price — tickets already sold. You can change capacity or end sales early.' },
  'ticketTiers.deletedSuccess': { hr: 'Cjenovni razred uspješno obrisan', en: 'Ticket tier deleted successfully' },
  'ticketTiers.deleteFailed': { hr: 'Brisanje cjenovnog razreda neuspješno', en: 'Failed to delete ticket tier' },
  'ticketTiers.erpUpdated': { hr: 'ERP kod ažuriran', en: 'ERP code updated' },
  'ticketTiers.erpUpdateFailed': { hr: 'Ažuriranje ERP koda neuspješno', en: 'Failed to update ERP code' },

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
