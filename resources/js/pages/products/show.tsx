import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, Star } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import ProductGrid from '@/components/storefront/product-grid';
import StorefrontLayout from '@/components/storefront/storefront-layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, type Enquiry, type Product } from '@/lib/api';
import type { SharedData } from '@/types';

interface ProductShowProps {
    product: number;
}

export default function ProductShow({ product: productId }: ProductShowProps) {
    const { auth } = usePage<SharedData>().props;
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enquiryOpen, setEnquiryOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        apiRequest<Product>(`/api/products/${productId}`)
            .then((response) => {
                if (active) {
                    setProduct(response.data);
                }
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError instanceof Error ? requestError.message : 'Product details could not be loaded.');
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [productId]);

    const submitEnquiry = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!product || !auth.user) {
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setNotice(null);

        try {
            await apiRequest<Enquiry>('/api/enquiries', {
                method: 'POST',
                body: JSON.stringify({ product_id: product.id, description }),
            });
            setDescription('');
            setEnquiryOpen(false);
            setNotice('Your enquiry has been sent. We’ll email you updates as its status changes.');
        } catch (requestError) {
            setSubmitError(requestError instanceof Error ? requestError.message : 'Your enquiry could not be submitted.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <StorefrontLayout selectedCategory={product?.category ?? ''}>
            <Head title={product?.title ?? 'Product details'} />
            {loading ? (
                <div className="flex min-h-[50vh] items-center justify-center">
                    <LoaderCircle className="size-8 animate-spin text-stone-500" aria-label="Loading product" />
                </div>
            ) : error || !product ? (
                <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
                    <h1 className="text-3xl font-semibold">This product isn’t available.</h1>
                    <p role="alert" className="mt-3 text-stone-500">
                        {error ?? 'Please browse our current collection.'}
                    </p>
                    <Button asChild className="mt-8 rounded-full">
                        <Link href="/products">Browse products</Link>
                    </Button>
                </section>
            ) : (
                <>
                    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
                        <Link
                            href="/products"
                            className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"
                        >
                            <ArrowLeft className="size-4" /> Back to all products
                        </Link>
                        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                            <div className="flex min-h-80 items-center justify-center rounded-[2rem] bg-white p-10 sm:p-16">
                                {product.image && (
                                    <img
                                        src={product.image}
                                        alt={product.title}
                                        referrerPolicy="no-referrer"
                                        className="max-h-[34rem] w-full object-contain"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col justify-center py-4">
                                <p className="text-xs font-bold tracking-[0.22em] text-amber-800 uppercase">{product.category}</p>
                                <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{product.title}</h1>
                                <div className="mt-5 flex items-center gap-4">
                                    <span className="text-2xl font-semibold">${Number(product.price).toFixed(2)}</span>
                                    {typeof product.rating?.rate === 'number' && (
                                        <span className="flex items-center gap-1.5 text-sm text-stone-500">
                                            <Star className="size-4 fill-amber-400 text-amber-400" />
                                            {product.rating.rate.toFixed(1)}
                                            {typeof product.rating.count === 'number' && <span>({product.rating.count} reviews)</span>}
                                        </span>
                                    )}
                                </div>
                                <div className="my-7 h-px bg-stone-200" />
                                <h2 className="text-sm font-semibold tracking-wider text-stone-600 uppercase">About this find</h2>
                                <p className="mt-3 leading-7 text-stone-600">{product.description}</p>
                                <Button
                                    type="button"
                                    size="lg"
                                    className="mt-9 w-full rounded-full bg-stone-950 py-6 text-base text-white hover:bg-stone-800 sm:w-fit sm:px-10"
                                    onClick={() => setEnquiryOpen(true)}
                                >
                                    Place an enquiry
                                </Button>
                                {notice && (
                                    <p role="status" className="mt-4 text-sm font-medium text-emerald-800">
                                        {notice}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {product.category && (
                        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-20">
                            <div className="mb-8">
                                <p className="text-xs font-bold tracking-[0.22em] text-amber-800 uppercase">More to love</p>
                                <h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured in {product.category}</h2>
                            </div>
                            <ProductGrid
                                endpoint={`/api/categories/${encodeURIComponent(product.category)}/featured?exclude=${product.id}`}
                                emptyMessage="No other featured products are available in this category."
                            />
                        </section>
                    )}
                </>
            )}

            {product && (
                <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
                    <DialogContent className="rounded-2xl border-stone-200 bg-[#fffefa] text-stone-950 sm:max-w-lg [&>button]:text-stone-950 [&>button]:opacity-100 [&>button]:hover:bg-stone-100 [&>button_svg]:text-stone-950">
                        <DialogHeader>
                            <DialogTitle className="text-2xl text-black">Enquire about this product</DialogTitle>
                            <DialogDescription>
                                Tell us what you’d like to know about {product.title}. We’ll send updates to your account email.
                            </DialogDescription>
                        </DialogHeader>
                        {auth.user ? (
                            <form onSubmit={submitEnquiry} className="space-y-4">
                                <label htmlFor="enquiry-description" className="block text-sm font-medium text-stone-800">
                                    Your message
                                </label>
                                <textarea
                                    id="enquiry-description"
                                    required
                                    maxLength={2000}
                                    rows={6}
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    placeholder="Share a few details about your enquiry..."
                                    className="w-full resize-y rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-stone-600 focus:ring-2 focus:ring-stone-200"
                                />
                                <div className="flex items-center justify-between text-xs text-stone-400">
                                    <span>Maximum 2,000 characters</span>
                                    <span>{description.length}/2000</span>
                                </div>
                                {submitError && (
                                    <p role="alert" className="text-sm text-red-700">
                                        {submitError}
                                    </p>
                                )}
                                <DialogFooter>
                                    <Button type="submit" disabled={submitting || !description.trim()} className="rounded-full px-7">
                                        {submitting && <LoaderCircle className="size-4 animate-spin" />}
                                        Send enquiry
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm leading-6 text-stone-600">
                                    Please sign in or create an account to submit an enquiry and receive status updates by email.
                                </p>
                                <DialogFooter>
                                    <Button asChild variant="outline" className="rounded-full">
                                        <Link href={route('login')}>Log in</Link>
                                    </Button>
                                    <Button asChild className="rounded-full">
                                        <Link href={route('register')}>Create account</Link>
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </StorefrontLayout>
    );
}
