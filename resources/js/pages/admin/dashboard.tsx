import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { apiRequest, type Product } from '@/lib/api';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type FormEvent, useEffect, useState } from 'react';

type AdminTab = 'overview' | 'users' | 'products' | 'enquiries';
type EnquiryStatus = 'pending' | 'completed';

interface AdminDashboardProps {
    activeTab: AdminTab;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    total: number;
}

interface AdminUser {
    name: string;
    email: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: string | null;
}

interface AdminProduct extends Product {
    is_active: boolean;
}

interface AdminEnquiry {
    id: number;
    description: string;
    status: EnquiryStatus;
    admin_remarks: string | null;
    created_at: string;
    product: Pick<Product, 'id' | 'title' | 'category' | 'price' | 'image'> | null;
    user: { name: string; email: string } | null;
}

interface Filters {
    q: string;
    role: '' | '1' | '0';
    category: string;
    is_active: '' | '1' | '0';
    is_featured: '' | '1' | '0';
    is_featured_in_category: '' | '1' | '0';
    status: '' | EnquiryStatus;
    product_id: string;
    sort_by: string;
    sort_direction: 'asc' | 'desc';
}

const initialFilters: Filters = {
    q: '',
    role: '',
    category: '',
    is_active: '',
    is_featured: '',
    is_featured_in_category: '',
    status: '',
    product_id: '',
    sort_by: 'created_at',
    sort_direction: 'desc',
};

const tabHeadings: Record<AdminTab, string> = {
    overview: 'Administration overview',
    users: 'Users',
    products: 'Products',
    enquiries: 'Product enquiries',
};

const currency = (price: string) => `$${Number(price).toFixed(2)}`;

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [enquiries, setEnquiries] = useState<AdminEnquiry[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [overview, setOverview] = useState<{ users: number; products: number; pending: number; categories: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [categoryError, setCategoryError] = useState('');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Overview', href: '/admin' },
        ...(activeTab === 'overview' ? [] : [{ title: tabHeadings[activeTab], href: `/admin/${activeTab}` }]),
    ];

    useEffect(() => {
        let isCurrent = true;
        apiRequest<string[]>('/api/admin/categories')
            .then((response) => {
                if (isCurrent) {
                    setCategories(response.data);
                }
            })
            .catch((requestError: unknown) => {
                if (isCurrent) {
                    setCategoryError(requestError instanceof Error ? requestError.message : 'Unable to load categories.');
                }
            });

        return () => {
            isCurrent = false;
        };
    }, []);

    useEffect(() => {
        if (activeTab !== 'overview') {
            return;
        }

        let isCurrent = true;
        setLoading(true);
        setError('');

        Promise.all([
            apiRequest<AdminUser[]>('/api/admin/users?page_size=1'),
            apiRequest<AdminProduct[]>('/api/admin/products?page_size=1'),
            apiRequest<AdminEnquiry[]>('/api/admin/enquiries?status=pending&page_size=1'),
            apiRequest<string[]>('/api/admin/categories'),
        ])
            .then(([userResponse, productResponse, enquiryResponse, categoryResponse]) => {
                if (isCurrent) {
                    setOverview({
                        users: userResponse.meta?.total ?? userResponse.data.length,
                        products: productResponse.meta?.total ?? productResponse.data.length,
                        pending: enquiryResponse.meta?.total ?? enquiryResponse.data.length,
                        categories: categoryResponse.data.length,
                    });
                }
            })
            .catch((requestError: unknown) => {
                if (isCurrent) {
                    setError(requestError instanceof Error ? requestError.message : 'Unable to load the administration overview.');
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
    }, [activeTab, refreshKey]);

    useEffect(() => {
        if (activeTab === 'overview') {
            return;
        }

        let isCurrent = true;
        const query = new URLSearchParams({ page: String(page), page_size: '15' });
        if (appliedFilters.q.trim()) query.set('q', appliedFilters.q.trim());
        query.set('sort_by', appliedFilters.sort_by);
        query.set('sort_direction', appliedFilters.sort_direction);

        let endpoint = '';
        if (activeTab === 'users') {
            endpoint = '/api/admin/users';
            if (appliedFilters.role !== '') query.set('is_admin', appliedFilters.role);
        } else if (activeTab === 'products') {
            endpoint = '/api/admin/products';
            if (appliedFilters.category) query.set('category', appliedFilters.category);
            if (appliedFilters.is_active !== '') query.set('is_active', appliedFilters.is_active);
            if (appliedFilters.is_featured !== '') query.set('is_featured', appliedFilters.is_featured);
            if (appliedFilters.is_featured_in_category !== '') query.set('is_featured_in_category', appliedFilters.is_featured_in_category);
        } else {
            endpoint = '/api/admin/enquiries';
            if (appliedFilters.status) query.set('status', appliedFilters.status);
            if (appliedFilters.product_id) query.set('product_id', appliedFilters.product_id);
        }

        setLoading(true);
        setError('');
        setMeta(null);
        apiRequest<AdminUser[] | AdminProduct[] | AdminEnquiry[]>(`${endpoint}?${query.toString()}`)
            .then((response) => {
                if (!isCurrent) return;
                setMeta(response.meta ?? null);
                if (activeTab === 'users') setUsers(response.data as AdminUser[]);
                if (activeTab === 'products') setProducts(response.data as AdminProduct[]);
                if (activeTab === 'enquiries') setEnquiries(response.data as AdminEnquiry[]);
            })
            .catch((requestError: unknown) => {
                if (isCurrent) {
                    setError(requestError instanceof Error ? requestError.message : 'Unable to load this list.');
                }
            })
            .finally(() => {
                if (isCurrent) setLoading(false);
            });

        return () => {
            isCurrent = false;
        };
    }, [activeTab, page, appliedFilters, refreshKey]);

    function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
        setFilters((current) => ({ ...current, [key]: value }));
    }

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPage(1);
        setAppliedFilters({ ...filters });
    }

    function refreshList() {
        setRefreshKey((current) => current + 1);
    }

    const title = tabHeadings[activeTab];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-10">
                <header>
                    <p className="text-muted-foreground text-sm font-medium">Admin workspace</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground mt-2">Manage users, catalogue products, and customer enquiries.</p>
                </header>

                {error && (
                    <div role="alert" className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
                        {error}
                    </div>
                )}

                {activeTab === 'overview' ? (
                    <section className="space-y-6">
                        {overview ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <OverviewCard title="Users" value={overview.users} href="/admin/users" />
                                <OverviewCard title="Products" value={overview.products} href="/admin/products" />
                                <OverviewCard title="Pending enquiries" value={overview.pending} href="/admin/enquiries" />
                                <OverviewCard title="Categories" value={overview.categories} href="/admin/products" />
                            </div>
                        ) : (
                            <p className="text-muted-foreground rounded-xl border p-6 text-sm">
                                {loading ? 'Loading administration data...' : 'Administration data is not available.'}
                            </p>
                        )}
                        <section className="rounded-2xl border p-6">
                            <h2 className="text-lg font-semibold">Management</h2>
                            <p className="text-muted-foreground mt-1 text-sm">Open a workspace to search, filter, sort, and review its records.</p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button asChild variant="outline">
                                    <Link href="/admin/users">Manage users</Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/admin/products">Manage products</Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/admin/enquiries">Review enquiries</Link>
                                </Button>
                            </div>
                        </section>
                    </section>
                ) : (
                    <>
                        <form onSubmit={applyFilters} className="bg-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-2 xl:grid-cols-4">
                            <label className="space-y-1.5 text-sm font-medium">
                                <span>Case-sensitive search</span>
                                <input
                                    value={filters.q}
                                    onChange={(event) => updateFilter('q', event.target.value)}
                                    maxLength={120}
                                    placeholder={
                                        activeTab === 'users'
                                            ? 'Name or email'
                                            : activeTab === 'products'
                                              ? 'Title, category, price...'
                                              : 'Product, user, or message'
                                    }
                                    className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 font-normal outline-none focus-visible:ring-2"
                                />
                            </label>

                            {activeTab === 'users' && (
                                <FilterSelect
                                    label="Account role"
                                    value={filters.role}
                                    onChange={(value) => updateFilter('role', value as Filters['role'])}
                                >
                                    <option value="">All users</option>
                                    <option value="1">Admins</option>
                                    <option value="0">Non-admins</option>
                                </FilterSelect>
                            )}

                            {activeTab === 'products' && (
                                <>
                                    <FilterSelect label="Category" value={filters.category} onChange={(value) => updateFilter('category', value)}>
                                        <option value="">All categories</option>
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </FilterSelect>
                                    <FilterSelect
                                        label="Active"
                                        value={filters.is_active}
                                        onChange={(value) => updateFilter('is_active', value as Filters['is_active'])}
                                    >
                                        <option value="">All products</option>
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </FilterSelect>
                                    <FilterSelect
                                        label="Featured"
                                        value={filters.is_featured}
                                        onChange={(value) => updateFilter('is_featured', value as Filters['is_featured'])}
                                    >
                                        <option value="">All</option>
                                        <option value="1">Featured</option>
                                        <option value="0">Not featured</option>
                                    </FilterSelect>
                                    <FilterSelect
                                        label="Category featured"
                                        value={filters.is_featured_in_category}
                                        onChange={(value) => updateFilter('is_featured_in_category', value as Filters['is_featured_in_category'])}
                                    >
                                        <option value="">All</option>
                                        <option value="1">Featured in category</option>
                                        <option value="0">Not category featured</option>
                                    </FilterSelect>
                                </>
                            )}

                            {activeTab === 'enquiries' && (
                                <>
                                    <FilterSelect
                                        label="Status"
                                        value={filters.status}
                                        onChange={(value) => updateFilter('status', value as Filters['status'])}
                                    >
                                        <option value="">All statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </FilterSelect>
                                    <label className="space-y-1.5 text-sm font-medium">
                                        <span>Product ID</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={filters.product_id}
                                            onChange={(event) => updateFilter('product_id', event.target.value)}
                                            className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 font-normal outline-none focus-visible:ring-2"
                                        />
                                    </label>
                                </>
                            )}

                            <FilterSelect label="Sort by" value={filters.sort_by} onChange={(value) => updateFilter('sort_by', value)}>
                                {activeTab === 'users' && (
                                    <>
                                        <option value="created_at">Date created</option>
                                        <option value="name">Name</option>
                                        <option value="email">Email</option>
                                        <option value="is_admin">Role</option>
                                    </>
                                )}
                                {activeTab === 'products' && (
                                    <>
                                        <option value="created_at">Date created</option>
                                        <option value="title">Title</option>
                                        <option value="category">Category</option>
                                        <option value="price">Price</option>
                                        <option value="is_active">Active</option>
                                        <option value="is_featured">Featured</option>
                                        <option value="is_featured_in_category">Category featured</option>
                                    </>
                                )}
                                {activeTab === 'enquiries' && (
                                    <>
                                        <option value="created_at">Date created</option>
                                        <option value="status">Status</option>
                                        <option value="product_title">Product</option>
                                        <option value="user_name">User</option>
                                    </>
                                )}
                            </FilterSelect>

                            <FilterSelect
                                label="Sort direction"
                                value={filters.sort_direction}
                                onChange={(value) => updateFilter('sort_direction', value as Filters['sort_direction'])}
                            >
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </FilterSelect>

                            <div className="flex items-end">
                                <Button type="submit" className="w-full sm:w-auto">
                                    Apply filters
                                </Button>
                            </div>
                        </form>

                        {categoryError && activeTab === 'products' && (
                            <p role="alert" className="text-destructive text-sm">
                                {categoryError}
                            </p>
                        )}

                        {loading ? (
                            <p className="text-muted-foreground rounded-xl border p-8 text-center text-sm">Loading {title.toLowerCase()}...</p>
                        ) : activeTab === 'users' ? (
                            <UsersTable users={users} adminEmail={auth.user?.email ?? ''} onUpdated={refreshList} />
                        ) : activeTab === 'products' ? (
                            <ProductsTable products={products} onUpdated={refreshList} />
                        ) : (
                            <div className="space-y-4">
                                {enquiries.length === 0 ? (
                                    <EmptyList message="No enquiries match these filters." />
                                ) : (
                                    enquiries.map((enquiry) => <EnquiryEditor key={enquiry.id} enquiry={enquiry} onUpdated={refreshList} />)
                                )}
                            </div>
                        )}

                        {meta && (
                            <nav aria-label={`${title} pages`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground text-sm">
                                    {meta.total} records · Page {meta.current_page} of {Math.max(meta.last_page, 1)}
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

function OverviewCard({ title, value, href }: { title: string; value: number; href: string }) {
    return (
        <Link href={href} className="bg-card hover:bg-muted/30 rounded-2xl border p-5 transition-colors">
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</p>
            <span className="text-primary mt-3 block text-sm font-medium">Open list</span>
        </Link>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    children,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <label className="space-y-1.5 text-sm font-medium">
            <span>{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 font-normal outline-none focus-visible:ring-2"
            >
                {children}
            </select>
        </label>
    );
}

function UsersTable({ users, adminEmail, onUpdated }: { users: AdminUser[]; adminEmail: string; onUpdated: () => void }) {
    if (users.length === 0) return <EmptyList message="No users match these filters." />;

    return (
        <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                        <th className="px-5 py-3">User</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Account</th>
                        <th className="px-5 py-3">Joined</th>
                        <th className="px-5 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {users.map((user) => (
                        <tr key={user.email}>
                            <td className="px-5 py-4">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-muted-foreground mt-1">{user.email}</p>
                            </td>
                            <td className="px-5 py-4">{user.is_admin ? 'Admin' : 'Customer'}</td>
                            <td className="px-5 py-4">{user.is_active ? 'Active' : 'Inactive'}</td>
                            <td className="text-muted-foreground px-5 py-4">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-4">
                                <UserActiveAction user={user} adminEmail={adminEmail} onUpdated={onUpdated} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ProductsTable({ products, onUpdated }: { products: AdminProduct[]; onUpdated: () => void }) {
    if (products.length === 0) return <EmptyList message="No products match these filters." />;

    return (
        <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                        <th className="px-5 py-3">Product</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Featured</th>
                        <th className="px-5 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {products.map((product) => (
                        <tr key={product.id}>
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                    {product.image && (
                                        <img src={product.image} alt="" className="size-11 rounded-md border bg-white object-contain p-1" />
                                    )}
                                    <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                                        {product.title}
                                    </Link>
                                </div>
                            </td>
                            <td className="text-muted-foreground px-5 py-4">{product.category ?? '—'}</td>
                            <td className="px-5 py-4">{currency(product.price)}</td>
                            <td className="px-5 py-4">{product.is_active ? 'Active' : 'Inactive'}</td>
                            <td className="px-5 py-4">
                                {product.is_featured ? 'Home' : '—'}
                                {product.is_featured_in_category ? ' / Category' : ''}
                            </td>
                            <td className="px-5 py-4">
                                <ProductFeatureDialog product={product} onUpdated={onUpdated} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function UserActiveAction({ user, adminEmail, onUpdated }: { user: AdminUser; adminEmail: string; onUpdated: () => void }) {
    const [isActive, setIsActive] = useState(user.is_active);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isCurrentAdmin = user.email === adminEmail;

    useEffect(() => {
        setIsActive(user.is_active);
    }, [user.is_active]);

    async function toggleActive() {
        setSaving(true);
        setError('');

        try {
            const response = await apiRequest<{ is_active: boolean }>('/api/admin/users/active', {
                method: 'PATCH',
                body: JSON.stringify({ email: user.email, is_active: !isActive }),
            });
            setIsActive(response.data.is_active);
            onUpdated();
        } catch (requestError: unknown) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update this account.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col items-start gap-1">
            <Button type="button" size="sm" variant="outline" disabled={saving || isCurrentAdmin} onClick={toggleActive}>
                {saving ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
            </Button>
            {isCurrentAdmin && <span className="text-muted-foreground text-xs">Current admin</span>}
            {error && (
                <span role="alert" className="text-destructive text-xs">
                    {error}
                </span>
            )}
        </div>
    );
}

function ProductFeatureDialog({ product, onUpdated }: { product: AdminProduct; onUpdated: () => void }) {
    const [open, setOpen] = useState(false);
    const [isFeatured, setIsFeatured] = useState(product.is_featured);
    const [isFeaturedInCategory, setIsFeaturedInCategory] = useState(product.is_featured_in_category);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setIsFeatured(product.is_featured);
        setIsFeaturedInCategory(product.is_featured_in_category);
    }, [product.is_featured, product.is_featured_in_category]);

    async function saveFeatures(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await apiRequest<AdminProduct>(`/api/admin/products/${product.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    is_featured: isFeatured,
                    is_featured_in_category: isFeaturedInCategory,
                }),
            });
            setOpen(false);
            onUpdated();
        } catch (requestError: unknown) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update product features.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
                Edit features
            </Button>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Product features</DialogTitle>
                    <DialogDescription>Choose where {product.title} should be featured.</DialogDescription>
                </DialogHeader>
                <form onSubmit={saveFeatures} className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg border p-3">
                        <Checkbox
                            id={`home-feature-${product.id}`}
                            checked={isFeatured}
                            onCheckedChange={(checked) => setIsFeatured(checked === true)}
                        />
                        <div>
                            <label htmlFor={`home-feature-${product.id}`} className="cursor-pointer text-sm font-medium">
                                Featured on home page
                            </label>
                            <p className="text-muted-foreground mt-1 text-xs">Show this product in the home page featured section.</p>
                        </div>
                    </div>
                    <div className={`flex items-start gap-3 rounded-lg border p-3 ${product.category ? '' : 'opacity-60'}`}>
                        <Checkbox
                            id={`category-feature-${product.id}`}
                            checked={isFeaturedInCategory}
                            disabled={!product.category}
                            onCheckedChange={(checked) => setIsFeaturedInCategory(checked === true)}
                        />
                        <div>
                            <label
                                htmlFor={`category-feature-${product.id}`}
                                className={`text-sm font-medium ${product.category ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                                Featured in its category
                            </label>
                            <p className="text-muted-foreground mt-1 text-xs">
                                {product.category
                                    ? `Show this product in ${product.category} featured products.`
                                    : 'A category is required for this option.'}
                            </p>
                        </div>
                    </div>
                    {error && (
                        <p role="alert" className="text-destructive text-sm">
                            {error}
                        </p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save features'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EnquiryEditor({ enquiry, onUpdated }: { enquiry: AdminEnquiry; onUpdated: () => void }) {
    const [status, setStatus] = useState<EnquiryStatus>(enquiry.status);
    const [remarks, setRemarks] = useState(enquiry.admin_remarks ?? '');
    const [completed, setCompleted] = useState(enquiry.status === 'completed');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setStatus(enquiry.status);
        setRemarks(enquiry.admin_remarks ?? '');
        setCompleted(enquiry.status === 'completed');
    }, [enquiry.status, enquiry.admin_remarks]);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSaved(false);

        try {
            const response = await apiRequest<AdminEnquiry>(`/api/admin/enquiries/${enquiry.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status, admin_remarks: remarks }),
            });
            setStatus(response.data.status);
            setRemarks(response.data.admin_remarks ?? '');
            setCompleted(response.data.status === 'completed');
            setSaved(true);
            onUpdated();
        } catch (requestError: unknown) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to update this enquiry.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <article className="bg-card rounded-2xl border p-5 md:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                    <p className="text-muted-foreground text-xs">{new Date(enquiry.created_at).toLocaleString()}</p>
                    <h2 className="mt-1 text-lg font-semibold">{enquiry.product?.title ?? 'Product unavailable'}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {enquiry.user ? `${enquiry.user.name} · ${enquiry.user.email}` : 'User account unavailable'}
                    </p>
                </div>
                <span
                    className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}
                >
                    {status}
                </span>
            </div>
            <p className="bg-muted/50 mt-4 rounded-xl p-4 text-sm whitespace-pre-wrap">{enquiry.description}</p>

            <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
                <label className="space-y-1.5 text-sm font-medium">
                    <span>Status</span>
                    <select
                        value={status}
                        disabled={completed || saving}
                        onChange={(event) => {
                            setStatus(event.target.value as EnquiryStatus);
                            setSaved(false);
                        }}
                        className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 font-normal outline-none focus-visible:ring-2"
                    >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                    <span>Admin remark (required)</span>
                    <input
                        required
                        maxLength={255}
                        value={remarks}
                        disabled={completed || saving}
                        onChange={(event) => {
                            setRemarks(event.target.value);
                            setSaved(false);
                        }}
                        className="bg-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 font-normal outline-none focus-visible:ring-2"
                    />
                </label>
                <Button type="submit" disabled={saving || completed}>
                    {saving ? 'Saving...' : completed ? 'Completed' : 'Save update'}
                </Button>
            </form>
            {completed && <p className="text-muted-foreground mt-3 text-sm">Completed enquiries can no longer be changed.</p>}
            {error && (
                <p role="alert" className="text-destructive mt-3 text-sm">
                    {error}
                </p>
            )}
            {saved && (
                <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
                    Enquiry updated.
                </p>
            )}
        </article>
    );
}

function EmptyList({ message }: { message: string }) {
    return <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">{message}</p>;
}
