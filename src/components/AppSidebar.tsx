import { LayoutDashboard, Calendar, Settings, LogOut, Shield, MessageCircle, ChevronUp } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminLanguage } from '@/contexts/AdminLanguageContext';
import { isAdmin } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import conwayoLogoDark from '@/assets/conwayo-logo-dark.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, signOut } = useAuth();
  const { t } = useAdminLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { title: t('nav.dashboard'), url: '/', icon: LayoutDashboard },
    { title: t('nav.events'), url: '/events', icon: Calendar },
  ];

  const adminItems = [
    { title: t('nav.adminPanel'), url: '/admin', icon: Shield },
    { title: t('nav.whatsappInspector'), url: '/admin/chats', icon: MessageCircle },
  ];

  const handleSignOut = async () => {
    await signOut();
  };


  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  const allItems = [
    ...navItems,
    ...(isAdmin(profile?.role) ? adminItems : []),
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <Link to="/" className="block p-4 border-b border-sidebar-border hover:opacity-90 transition-opacity">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold text-white font-['Poppins']">C</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img src={conwayoLogoDark} alt="Conwayo" className="h-10 w-auto object-contain" />
          </div>
        )}
      </Link>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                          active
                            ? 'bg-sidebar-accent text-white font-medium shadow-lg shadow-primary/10'
                            : 'text-sidebar-foreground hover:text-white hover:bg-sidebar-accent/50'
                        }`}
                        activeClassName=""
                      >
                        <item.icon className={`h-5 w-5 shrink-0 ${active ? 'text-brand-cyan' : ''}`} />
                        {!collapsed && (
                          <span className={active ? 'text-brand-gradient font-semibold' : ''}>
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors text-left">
              <div className="profile-aura shrink-0">
                <div className="profile-aura-inner h-9 w-9 text-white font-semibold text-sm">
                  {(profile?.first_name?.[0] || '').toUpperCase()}{(profile?.last_name?.[0] || '').toUpperCase()}
                </div>
              </div>
              {!collapsed && profile && (
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm truncate">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sidebar-foreground/60 truncate text-xs">
                    {profile.email}
                  </p>
                </div>
              )}
              {!collapsed && <ChevronUp className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
