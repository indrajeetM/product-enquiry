import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, Search, Sparkles } from 'lucide-react';
import { FormEvent, PropsWithChildren, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiRequest } from '@/lib/api';
import type { SharedData } from '@/types';

interface StorefrontLayoutProps extends PropsWithChildren {
    selectedCategory?: string;
}

export default function StorefrontLayout({ children, selectedCategory = '' }: StorefrontLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const [categories, setCategories] = useState<string[]>([]);
    const [categoryError, setCategoryError] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let active = true;
        apiRequest<string[]>('/api/categories')
            .then((response) => {
                if (active) {
                    setCategories(response.data);
                }
            })
            .catch(() => {
                if (active) {
                    setCategoryError(true);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const term = search.trim();
        if (term) {
            router.get('/search', { q: term }, { preserveState: false, preserveScroll: false });
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f6f2] text-stone-950">
            <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f7f6f2]/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4 lg:flex-nowrap lg:px-8">
                    <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-stone-950 text-white">
                            <Sparkles className="size-4" />
                        </span>
                        <span>Goods &amp; Co.</span>
                    </Link>

                    <form onSubmit={submitSearch} className="order-3 flex w-full lg:order-2 lg:mx-8 lg:max-w-xl">
                        <label className="sr-only" htmlFor="store-search">
                            Search products
                        </label>
                        <div className="flex w-full items-center rounded-full border border-stone-300 bg-white px-4 shadow-sm focus-within:border-stone-500">
                            <Search className="size-4 shrink-0 text-stone-400" />
                            <input
                                id="store-search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search products, categories, and more"
                                className="h-11 w-full border-0 bg-transparent px-3 text-sm outline-none placeholder:text-stone-400 focus:ring-0"
                            />
                            <button type="submit" className="text-sm font-semibold text-stone-800 hover:text-amber-700">
                                Search
                            </button>
                        </div>
                    </form>

                    <div className="order-2 ml-auto flex items-center gap-2 lg:order-3">
                        {auth.user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="max-w-48 rounded-full border-stone-300 bg-white text-stone-900 hover:bg-stone-100 hover:text-stone-950"
                                    >
                                        <span className="max-w-32 truncate">{auth.user.name}</span>
                                        <ChevronDown aria-hidden="true" className="ml-1 size-4 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-40 border-stone-200 bg-white text-stone-950">
                                    <DropdownMenuItem asChild>
                                        <Link href={route('dashboard')} className="cursor-pointer text-stone-900">
                                            Account
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="w-full cursor-pointer text-left text-stone-900"
                                        >
                                            Log out
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button asChild size="sm" variant="ghost">
                                    <Link href={route('login')}>Log in</Link>
                                </Button>
                                <Button asChild size="sm">
                                    <Link href={route('register')}>Register</Link>
                                </Button>
                            </>
                        )}
                    </div>

                    <nav className="order-4 flex w-full items-center gap-3 text-sm lg:order-4 lg:w-auto">
                        <span className="shrink-0 font-semibold text-stone-700">Browse</span>
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                aria-label="Browse product categories"
                                onChange={(event) => {
                                    const category = event.target.value;
                                    router.visit(category ? `/products/category/${encodeURIComponent(category)}` : '/products');
                                }}
                                className="h-9 min-w-40 appearance-none rounded-full border border-stone-300 bg-white py-2 pr-11 pl-4 text-sm text-stone-700 outline-none focus:border-stone-500"
                            >
                                <option value="">All products</option>
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                                {categoryError && <option disabled>Categories unavailable</option>}
                            </select>
                            <ChevronDown
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-stone-500"
                            />
                        </div>
                    </nav>
                    {categoryError && (
                        <p role="alert" className="order-5 w-full text-xs text-red-700">
                            Product categories could not be loaded. Please refresh to try again.
                        </p>
                    )}
                </div>
            </header>

            <main>{children}</main>

            <footer className="mt-20 border-t border-stone-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                    <span>Thoughtful finds for everyday living.</span>
                    <span>Browse freely. Enquire when you’re ready.</span>
                </div>
            </footer>
        </div>
    );
}
