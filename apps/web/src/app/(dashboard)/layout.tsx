'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { TenantProvider, useTenant } from '@/contexts/tenant-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  LayoutGrid,
  Clock,
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const allMenuItems = [
  {
    label: 'Bookings',
    href: '/bookings',
    icon: Calendar,
    roles: ['TURF_OWNER', 'TURF_MANAGER', 'TURF_STAFF'],
  },
  { label: 'Courts', href: '/courts', icon: LayoutGrid, roles: ['TURF_OWNER', 'TURF_MANAGER'] },
  { label: 'Slots', href: '/slots', icon: Clock, roles: ['TURF_OWNER', 'TURF_MANAGER'] },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['TURF_OWNER'] },
  { label: 'Staff', href: '/staff', icon: Users, roles: ['TURF_OWNER', 'TURF_MANAGER'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['TURF_OWNER'] },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && user && user.role === 'TURF_OWNER' && !user.tenantId) {
      router.push('/onboarding');
    }
  }, [user, authLoading, router]);

  if (authLoading || tenantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const menuItems = allMenuItems.filter((item) => item.roles.includes(user?.role || ''));

  // Role-based route access check
  const allowedPaths = menuItems.map((item) => item.href);
  const isSettingsSubpage = pathname.startsWith('/settings');
  const hasAccess = allowedPaths.some((p) => pathname.startsWith(p)) || isSettingsSubpage;

  if (!hasAccess && menuItems.length > 0) {
    router.push(menuItems[0].href);
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-lg font-bold text-primary">{tenant?.name || 'BookMyTurf'}</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-6">
              <h1 className="text-lg font-bold text-primary">{tenant?.name || 'BookMyTurf'}</h1>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Link href="/settings" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} />
                ) : (
                  <AvatarFallback className="text-xs">{user?.firstName?.[0] || 'U'}</AvatarFallback>
                )}
              </Avatar>
              <span className="hidden text-sm font-medium md:block">{user?.firstName}</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <DashboardContent>{children}</DashboardContent>
    </TenantProvider>
  );
}
