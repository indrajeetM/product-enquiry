import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ClipboardList, ShoppingBag } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
                <section>
                    <p className="text-muted-foreground text-sm font-medium">Your account</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {auth.user?.name}</h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl">Keep track of your product enquiries or continue browsing the catalogue.</p>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <Link
                        href="/enquiries"
                        className="group bg-card hover:border-primary/40 hover:bg-muted/30 rounded-2xl border p-6 transition-colors"
                    >
                        <ClipboardList className="text-primary size-6" />
                        <h2 className="mt-5 text-lg font-semibold">My enquiries</h2>
                        <p className="text-muted-foreground mt-2 text-sm">Review the enquiries you have submitted and their latest status.</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                            View enquiry history <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Link>

                    <Link
                        href="/products"
                        className="group bg-card hover:border-primary/40 hover:bg-muted/30 rounded-2xl border p-6 transition-colors"
                    >
                        <ShoppingBag className="text-primary size-6" />
                        <h2 className="mt-5 text-lg font-semibold">Browse products</h2>
                        <p className="text-muted-foreground mt-2 text-sm">Explore the catalogue and find a product that suits you.</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                            Visit the storefront <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Link>
                </section>

                <Button asChild variant="outline" className="w-fit rounded-full">
                    <Link href="/">Back to storefront</Link>
                </Button>
            </main>
        </AppLayout>
    );
}
