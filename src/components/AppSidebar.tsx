import { LayoutDashboard, Calendar, Users, Settings, LogOut, Shield, MessageCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/roles';
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
  { title: 'Attendees', url: '/attendees', icon: Users },
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

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <Link to="/" className="block p-4 border-b border-sidebar-border hover:opacity-80 transition-opacity">
        <h1 className={`font-bold text-white tracking-tight transition-all ${collapsed ? 'text-lg' : 'text-2xl'}`}>
          {collapsed ? 'C' : 'Conwayo'}
        </h1>
      </Link>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors"
                      activeClassName="bg-sidebar-accent text-white font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin items */}
              {isAdmin(profile?.role) && adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors"
                      activeClassName="bg-sidebar-accent text-white font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="mb-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {(profile.first_name?.[0] || '').toUpperCase()}{(profile.last_name?.[0] || '').toUpperCase()}
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
