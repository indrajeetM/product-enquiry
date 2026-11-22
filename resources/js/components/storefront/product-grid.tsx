import { LoaderCircle } from 'lucide-react';

import ProductCard from '@/components/storefront/product-card';
import { Button } from '@/components/ui/button';
import { useInfiniteProducts } from '@/hooks/use-infinite-products';

export default function ProductGrid({ endpoint, emptyMessage }: { endpoint: string; emptyMessage: string }) {
    const { products, loading, hasMore, error, sentinelRef, loadMore } = useInfiniteProducts(endpoint);

    return (
        <>
            {products.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : !loading && !error ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-stone-500">{emptyMessage}</div>
            ) : null}

            {error && (
                <div
                    role="alert"
                    className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <span>{error}</span>
                    <Button type="button" variant="outline" onClick={() => void loadMore()}>
                        Try again
                    </Button>
                </div>
            )}

            <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6" aria-live="polite">
                {loading && <LoaderCircle className="size-6 animate-spin text-stone-500" aria-label="Loading products" />}
                {!loading && hasMore && (
                    <Button type="button" variant="outline" onClick={() => void loadMore()}>
                        Load more
                    </Button>
                )}
                {!loading && !hasMore && products.length > 0 && <p className="text-sm text-stone-400">You’re all caught up.</p>}
            </div>
        </>
    );
}
