import { LayoutDashboard, Calendar, Settings, LogOut, Shield, MessageCircle, Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
import conwayoLogoDark from '@/assets/conwayo-logo-dark.jpeg';
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
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Events', url: '/events', icon: Calendar },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const adminItems = [
  { title: 'Admin Panel', url: '/admin', icon: Shield },
  { title: 'WhatsApp Inspector', url: '/admin/chats', icon: MessageCircle },
  { title: 'User Directory', url: '/admin/users', icon: Phone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (url: string) => {
    if (url === '/') return location.pathname === '/';
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <Link to="/" className="block p-4 border-b border-sidebar-border hover:opacity-90 transition-opacity">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <div className="h-9 w-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <span className="text-white font-heading font-bold text-lg">C</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img src={conwayoLogoDark} alt="CONWAYO" className="h-9 w-auto" />
          </div>
        )}
      </Link>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
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

              {/* Admin items */}
              {isAdmin(profile?.role) && (
                <>
                  <div className="my-3 mx-3 h-px bg-sidebar-border/50" />
                  {adminItems.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
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
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 flex items-center gap-3">
            <div className="profile-aura shrink-0">
              <div className="profile-aura-inner h-9 w-9 text-white font-semibold text-sm">
                {(profile.first_name?.[0] || '').toUpperCase()}{(profile.last_name?.[0] || '').toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white text-sm truncate">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-sidebar-foreground/60 truncate text-xs">
                {profile.email}
              </p>
            </div>
          </div>
        )}
        {collapsed && profile && (
          <div className="flex justify-center mb-3">
            <div className="profile-aura shrink-0">
              <div className="profile-aura-inner h-9 w-9 text-white font-semibold text-sm">
                {(profile.first_name?.[0] || '').toUpperCase()}{(profile.last_name?.[0] || '').toUpperCase()}
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
