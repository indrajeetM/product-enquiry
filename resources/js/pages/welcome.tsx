import { Head } from '@inertiajs/react';
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';

import ProductGrid from '@/components/storefront/product-grid';
import StorefrontLayout from '@/components/storefront/storefront-layout';
import { Button } from '@/components/ui/button';

export default function Welcome() {
    return (
        <StorefrontLayout>
            <Head title="Discover everyday goods" />

            <section className="relative overflow-hidden bg-[#22261f] text-white">
                <div className="absolute -top-32 -right-20 size-[32rem] rounded-full border border-white/10" />
                <div className="absolute -top-16 -right-4 size-[25rem] rounded-full border border-white/10" />
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-32">
                    <div className="relative z-10">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-stone-200 uppercase">
                            <Sparkles className="size-3.5 text-amber-300" />
                            The considered collection
                        </div>
                        <h1 className="max-w-3xl text-5xl leading-[1.04] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                            Everyday things, <span className="font-serif font-normal text-amber-200 italic">better</span>.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300">
                            Thoughtfully picked essentials for work, home, and everything in between. Find your next favorite.
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-4">
                            <Button asChild size="lg" className="rounded-full bg-amber-200 text-stone-950 hover:bg-amber-100">
                                <a href="#featured">
                                    Explore featured <ArrowDown className="size-4" />
                                </a>
                            </Button>
                            <a href="/products" className="inline-flex items-center gap-2 text-sm font-medium text-stone-200 hover:text-white">
                                Browse everything <ArrowRight className="size-4" />
                            </a>
                        </div>
                    </div>
                    <div className="relative mx-auto flex aspect-square w-full max-w-[30rem] items-center justify-center">
                        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-amber-200/20 via-amber-100/5 to-transparent blur-2xl" />
                        <div className="relative flex h-[82%] w-[82%] rotate-[-6deg] items-center justify-center rounded-[2rem] border border-white/15 bg-white/5 p-7 shadow-2xl backdrop-blur-sm">
                            <div className="absolute inset-4 rounded-[1.5rem] border border-white/10" />
                            <div className="relative flex h-full w-full flex-col justify-between rounded-[1.25rem] bg-[#d7d0bc] p-8 text-stone-900 sm:p-10">
                                <div className="flex items-center justify-between text-xs font-bold tracking-[0.2em] uppercase">
                                    <span>Goods / 01</span>
                                    <Sparkles className="size-5" />
                                </div>
                                <div>
                                    <p className="font-serif text-5xl italic sm:text-6xl">Made for</p>
                                    <p className="mt-1 text-5xl font-semibold tracking-tight sm:text-6xl">living.</p>
                                </div>
                                <p className="max-w-52 text-sm leading-6 text-stone-700">
                                    A collection that makes the everyday feel a little more special.
                                </p>
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-0 rounded-2xl border border-white/15 bg-[#30352c] px-5 py-4 shadow-xl">
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-stone-400 uppercase">Curated with care</p>
                            <p className="mt-1 text-sm font-medium">Only the good stuff</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="featured" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold tracking-[0.22em] text-amber-800 uppercase">Handpicked for you</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Featured finds</h2>
                        <p className="mt-2 text-stone-500">The pieces we can’t stop talking about.</p>
                    </div>
                    <a
                        href="/products"
                        className="hidden items-center gap-2 text-sm font-semibold text-stone-700 hover:text-amber-800 sm:inline-flex"
                    >
                        See all products <ArrowRight className="size-4" />
                    </a>
                </div>
                <ProductGrid endpoint="/api/products/featured" emptyMessage="New featured products are on their way." />
            </section>
        </StorefrontLayout>
    );
}
