export interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    data: T;
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        has_more_pages: boolean;
    };
}

export async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (init.body) {
        headers.set('Content-Type', 'application/json');
    }

    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    if (token) {
        headers.set('X-CSRF-TOKEN', token);
    }

    const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'same-origin',
    });

    let payload: ApiEnvelope<T>;
    try {
        payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
        throw new Error('The server returned an unreadable response. Please try again.');
    }

    if (!response.ok || !payload.success) {
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(
                retryAfter
                    ? `${payload.message} Please retry in ${retryAfter} seconds.`
                    : payload.message || 'Too many requests. Please try again later.',
            );
        }

        throw new Error(payload.message || 'The request could not be completed.');
    }

    return payload;
}

export interface Product {
    id: number;
    title: string;
    description: string | null;
    price: string;
    category: string | null;
    image: string | null;
    rating: { rate?: number; count?: number } | null;
    is_featured: boolean;
    is_featured_in_category: boolean;
}

export interface Enquiry {
    id: number;
    description: string;
    status: 'pending' | 'completed';
    admin_remarks: string | null;
    created_at: string;
    product: Product | null;
}
