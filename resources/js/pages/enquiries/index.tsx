import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { apiRequest, type Enquiry } from '@/lib/api';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My enquiries', href: '/enquiries' },
];

export default function EnquiriesIndex() {
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isCurrent = true;
        setLoading(true);
        setError('');

        apiRequest<Enquiry[]>(`/api/enquiries?page=${page}`)
            .then((response) => {
                if (isCurrent) {
                    setEnquiries(response.data);
                    setMeta(response.meta ?? null);
                }
            })
            .catch((requestError: unknown) => {
                if (isCurrent) {
                    setError(requestError instanceof Error ? requestError.message : 'Unable to load your enquiries.');
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [page]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My enquiries" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-10">
                <header>
                    <p className="text-muted-foreground text-sm font-medium">Your account</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">My enquiries</h1>
                    <p className="text-muted-foreground mt-2">See the products you have enquired about and the latest response.</p>
                </header>

                {error && (
                    <div role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">Loading your enquiries…</p>
                ) : enquiries.length === 0 ? (
                    <section className="rounded-2xl border border-dashed p-8 text-center">
                        <h2 className="text-lg font-semibold">No enquiries yet</h2>
                        <p className="text-muted-foreground mt-2 text-sm">When you enquire about a product, it will appear here.</p>
                        <Button asChild className="mt-5 rounded-full">
                            <Link href="/products">Browse products</Link>
                        </Button>
                    </section>
                ) : (
                    <>
                        <div className="space-y-4">
                            {enquiries.map((enquiry) => (
                                <article key={enquiry.id} className="bg-card rounded-2xl border p-5 md:p-6">
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                        <div>
                                            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                                Submitted {new Date(enquiry.created_at).toLocaleDateString()}
                                            </p>
                                            <h2 className="mt-2 text-lg font-semibold">
                                                {enquiry.product ? (
                                                    <Link href={`/products/${enquiry.product.id}`} className="hover:underline">
                                                        {enquiry.product.title}
                                                    </Link>
                                                ) : (
                                                    'Product unavailable'
                                                )}
                                            </h2>
                                            {enquiry.product?.category && (
                                                <p className="text-muted-foreground mt-1 text-sm">{enquiry.product.category}</p>
                                            )}
                                        </div>
                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                                enquiry.status === 'completed'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                            }`}
                                        >
                                            {enquiry.status}
                                        </span>
                                    </div>

                                    <div className="bg-muted/50 mt-5 rounded-xl p-4">
                                        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Your message</p>
                                        <p className="mt-2 text-sm whitespace-pre-wrap">{enquiry.description}</p>
                                    </div>

                                    {enquiry.admin_remarks && (
                                        <div className="border-primary/15 bg-primary/5 mt-3 rounded-xl border p-4">
                                            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Response</p>
                                            <p className="mt-2 text-sm whitespace-pre-wrap">{enquiry.admin_remarks}</p>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>

                        {meta && meta.last_page > 1 && (
                            <nav aria-label="Enquiry history pages" className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm">
                                    Page {meta.current_page} of {meta.last_page} · {meta.total} enquiries
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={page <= 1 || loading}
                                        onClick={() => setPage((current) => current - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={page >= meta.last_page || loading}
                                        onClick={() => setPage((current) => current + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </nav>
                        )}
                    </>
                )}
            </main>
        </AppLayout>
    );
}
