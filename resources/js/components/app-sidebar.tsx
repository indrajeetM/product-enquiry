import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, LayoutDashboard, Package, Store, Users } from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user?.is_admin === true;
    const mainNavItems: NavItem[] = isAdmin
        ? [
              { title: 'Overview', url: '/admin', icon: LayoutDashboard },
              { title: 'Users', url: '/admin/users', icon: Users },
              { title: 'Products', url: '/admin/products', icon: Package },
              { title: 'Enquiries', url: '/admin/enquiries', icon: ClipboardList },
              { title: 'Storefront', url: '/', icon: Store },
          ]
        : [
              { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
              { title: 'My enquiries', url: '/enquiries', icon: ClipboardList },
              { title: 'Storefront', url: '/', icon: Store },
          ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isAdmin ? '/admin' : '/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
