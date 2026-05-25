import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { RejectionAlertBanner } from '@/components/RejectionAlertBanner';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: ReactNode;
}

function LanguageSwitcher() {
  const { lang, setLang } = useAdminLanguage();
  const display = lang === 'hr' ? 'HR' : 'EN';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-foreground/80 hover:text-foreground hover:bg-accent/50 transition-colors"
          aria-label="Change language"
        >
          <span className="font-medium text-sm">{display}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setLang('hr')} className="cursor-pointer">
          🇭🇷 Hrvatski
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('en')} className="cursor-pointer">
          🇺🇸 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <RejectionAlertBanner />
          <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <NotificationBell />
            </div>
          </header>
          <div className="flex-1 p-6 bg-background">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
