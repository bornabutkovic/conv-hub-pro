import { LayoutDashboard, Calendar, Users, Settings, LogOut, Shield, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
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
      {/* Logo - clickable link to home */}
      <Link to="/" className="block p-4 border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors">
        <h1 className={`font-bold text-primary transition-all ${collapsed ? 'text-lg' : 'text-2xl'}`}>
          {collapsed ? 'C' : 'Conveyo'}
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
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin items - Only visible to super_admin */}
              {profile?.role === 'super_admin' && adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
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
          <div className="mb-3 text-sm">
            <p className="font-medium text-sidebar-foreground">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {profile.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
