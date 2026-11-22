import { useCallback, useEffect, useRef, useState } from 'react';

import { apiRequest, type Product } from '@/lib/api';

export function useInfiniteProducts(endpoint: string) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
    const loadMoreRef = useRef<() => Promise<void>>(async () => undefined);

    useEffect(() => {
        let cancelled = false;
        let page = 1;
        let requestInFlight = false;
        let morePages = true;

        setProducts([]);
        setLoading(true);
        setHasMore(false);
        setError(null);

        const loadMore = async () => {
            if (cancelled || requestInFlight || !morePages) {
                return;
            }

            requestInFlight = true;
            setLoading(true);
            setError(null);

            try {
                const separator = endpoint.includes('?') ? '&' : '?';
                const response = await apiRequest<Product[]>(`${endpoint}${separator}page=${page}`);

                if (cancelled) {
                    return;
                }

                setProducts((current) => [...current, ...response.data]);
                page += 1;
                morePages = response.meta?.has_more_pages ?? false;
                setHasMore(morePages);
            } catch (requestError) {
                if (!cancelled) {
                    setError(requestError instanceof Error ? requestError.message : 'Products could not be loaded.');
                }
            } finally {
                requestInFlight = false;
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadMoreRef.current = loadMore;
        void loadMore();

        return () => {
            cancelled = true;
            loadMoreRef.current = async () => undefined;
        };
    }, [endpoint]);

    useEffect(() => {
        if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    void loadMoreRef.current();
                }
            },
            { rootMargin: '360px 0px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [endpoint, hasMore, sentinel]);

    const loadMore = useCallback(() => loadMoreRef.current(), []);

    return { products, loading, hasMore, error, sentinelRef: setSentinel, loadMore };
}
