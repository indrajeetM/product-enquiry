import { Link } from '@inertiajs/react';
import { ArrowUpRight, Star } from 'lucide-react';

import type { Product } from '@/lib/api';

export default function ProductCard({ product }: { product: Product }) {
    return (
        <Link
            href={`/products/${product.id}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-xl"
        >
            <div className="relative flex aspect-[4/3] items-center justify-center bg-stone-50 p-8">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="text-sm text-stone-400">Image unavailable</div>
                )}
                {product.is_featured && (
                    <span className="absolute top-4 left-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-wide text-amber-900">
                        FEATURED
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">{product.category}</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 min-h-12 font-medium text-stone-900">{product.title}</h3>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-stone-900" />
                </div>
                <div className="mt-auto flex items-center justify-between pt-5">
                    <span className="text-lg font-semibold text-stone-950">${Number(product.price).toFixed(2)}</span>
                    {typeof product.rating?.rate === 'number' && (
                        <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" />
                            {product.rating.rate.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
