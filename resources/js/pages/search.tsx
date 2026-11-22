import { Head } from '@inertiajs/react';
import { Search } from 'lucide-react';

import ProductGrid from '@/components/storefront/product-grid';
import StorefrontLayout from '@/components/storefront/storefront-layout';

interface SearchProps {
    q: string;
}

export default function SearchPage({ q }: SearchProps) {
    const endpoint = `/api/products/search?q=${encodeURIComponent(q)}`;

    return (
        <StorefrontLayout>
            <Head title={`Search: ${q}`} />
            <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
                <p className="text-xs font-bold tracking-[0.22em] text-amber-800 uppercase">Search results</p>
                <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-5xl">
                    <Search className="size-7 text-stone-400" />
                    <span className="break-all">{q}</span>
                </h1>
                <p className="mt-3 mb-8 text-stone-500">Matching title, category, description, or price.</p>
                <ProductGrid endpoint={endpoint} emptyMessage="No products match this search." />
            </section>
        </StorefrontLayout>
    );
}
