import { Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

import ProductGrid from '@/components/storefront/product-grid';
import StorefrontLayout from '@/components/storefront/storefront-layout';

interface ProductsIndexProps {
    category?: string | null;
}

export default function ProductsIndex({ category = null }: ProductsIndexProps) {
    const endpoint = category ? `/api/categories/${encodeURIComponent(category)}/products` : '/api/products';

    return (
        <StorefrontLayout selectedCategory={category ?? ''}>
            <Head title={category ? `${category} collection` : 'All products'} />
            <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
                <div className="mb-10">
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                        <span>Collection</span>
                        <ArrowRight className="size-3.5" />
                        <span className="font-medium text-stone-800">{category ?? 'All products'}</span>
                    </div>
                    <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{category ?? 'The whole collection'}</h1>
                    <p className="mt-3 max-w-2xl text-stone-500">Browse every product in the collection. Keep scrolling to discover more.</p>
                </div>
                <ProductGrid endpoint={endpoint} emptyMessage="No products are available in this collection yet." />
            </section>
        </StorefrontLayout>
    );
}
