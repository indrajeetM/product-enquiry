<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApiMessage;
use App\Enums\EnquiryStatus;
use App\Enums\Pagination;
use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Models\Product;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\CaseSensitiveSearch;
use App\Support\ProductData;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function users(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'string', 'max:120'],
            'is_admin' => ['sometimes', 'boolean'],
            'sort_by' => ['sometimes', Rule::in(['name', 'email', 'is_admin', 'created_at'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:'.Pagination::MaximumPageSize->value],
        ]);

        $query = User::query();

        if (array_key_exists('is_admin', $validated)) {
            $query->where('is_admin', $validated['is_admin']);
        }

        if (($validated['q'] ?? '') !== '') {
            CaseSensitiveSearch::contains($query, ['users.name', 'users.email'], $validated['q']);
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $direction = $validated['sort_direction'] ?? 'desc';
        if (in_array($sortBy, ['name', 'email'], true)) {
            CaseSensitiveSearch::orderBy($query, 'users.'.$sortBy, $direction);
        } elseif ($sortBy === 'is_admin') {
            $query->orderBy('users.is_admin', $direction);
        } else {
            $query->orderBy('users.'.$sortBy, $direction);
        }

        $paginator = $query->orderByDesc('users.id')
            ->paginate((int) ($validated['page_size'] ?? Pagination::DefaultPageSize->value))
            ->withQueryString();

        return ApiResponse::success(
            $paginator->getCollection()->map(fn (User $user): array => [
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at?->toISOString(),
                'updated_at' => $user->updated_at?->toISOString(),
            ])->values(),
            meta: $this->paginationMeta($paginator),
        );
    }

    public function updateUserStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', Rule::exists('users', 'email')],
            'is_active' => ['required', 'boolean'],
        ]);

        $user = DB::transaction(function () use ($request, $validated): ?User {
            $activeAdminIds = User::query()
                ->where('is_admin', true)
                ->where('is_active', true)
                ->orderBy('id')
                ->lockForUpdate()
                ->pluck('id');

            $target = User::query()
                ->where('email', $validated['email'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $validated['is_active'] && $target->is($request->user())) {
                return null;
            }

            if (! $validated['is_active'] && $target->is_admin && $activeAdminIds->count() <= 1) {
                return null;
            }

            $target->is_active = $validated['is_active'];
            $target->save();

            return $target;
        });

        if ($user === null) {
            return ApiResponse::error(ApiMessage::StateConflict->value, 409);
        }

        return ApiResponse::success([
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
            'is_active' => $user->is_active,
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_featured_in_category' => ['sometimes', 'boolean'],
            'sort_by' => ['sometimes', Rule::in(['title', 'price', 'category', 'created_at', 'is_active', 'is_featured', 'is_featured_in_category'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:'.Pagination::MaximumPageSize->value],
        ]);

        $query = Product::query();

        if (array_key_exists('category', $validated)) {
            CaseSensitiveSearch::equals($query, 'products.category', $validated['category']);
        }
        if (array_key_exists('is_active', $validated)) {
            $query->where('is_active', $validated['is_active']);
        }
        if (array_key_exists('is_featured', $validated)) {
            $query->where('is_featured', $validated['is_featured']);
        }
        if (array_key_exists('is_featured_in_category', $validated)) {
            $query->where('is_featured_in_category', $validated['is_featured_in_category']);
        }
        if (($validated['q'] ?? '') !== '') {
            CaseSensitiveSearch::contains($query, [
                'products.title',
                'products.category',
                'products.description',
                CaseSensitiveSearch::textCast('products.price'),
            ], $validated['q']);
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $direction = $validated['sort_direction'] ?? 'desc';
        if (in_array($sortBy, ['title', 'category'], true)) {
            CaseSensitiveSearch::orderBy($query, 'products.'.$sortBy, $direction);
        } else {
            $query->orderBy('products.'.$sortBy, $direction);
        }

        $paginator = $query
            ->orderByDesc('products.id')
            ->paginate((int) ($validated['page_size'] ?? Pagination::DefaultPageSize->value))
            ->withQueryString();

        return ApiResponse::success(
            $paginator->getCollection()->map(fn (Product $product): array => ProductData::admin($product))->values(),
            meta: $this->paginationMeta($paginator),
        );
    }

    public function updateProductFeatures(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'is_featured' => ['required', 'boolean'],
            'is_featured_in_category' => ['required', 'boolean'],
        ]);

        if ($product->category === null && $validated['is_featured_in_category']) {
            throw ValidationException::withMessages([
                'is_featured_in_category' => ['Products without a category cannot be featured in a category.'],
            ]);
        }

        $product->fill([
            'is_featured' => $validated['is_featured'],
            'is_featured_in_category' => $validated['is_featured_in_category'],
        ])->save();

        return ApiResponse::success(ProductData::admin($product->refresh()));
    }

    public function categories(): JsonResponse
    {
        $categories = Product::query()
            ->whereNotNull('category')
            ->pluck('category')
            ->filter(fn (?string $category): bool => $category !== null && $category !== '')
            ->unique()
            ->sort(SORT_STRING)
            ->values();

        return ApiResponse::success($categories);
    }

    public function enquiries(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['sometimes', 'string', 'max:120'],
            'product_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::enum(EnquiryStatus::class)],
            'sort_by' => ['sometimes', Rule::in(['created_at', 'status', 'product_title', 'user_name'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:'.Pagination::MaximumPageSize->value],
        ]);

        $query = Enquiry::query()
            ->with([
                'product:id,title,category,price,image',
                'user:id,name,email',
            ]);

        if (isset($validated['product_id'])) {
            $query->where('product_id', $validated['product_id']);
        }
        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (($validated['q'] ?? '') !== '') {
            $term = $validated['q'];
            $query->where(function (Builder $nested) use ($term): void {
                $nested->whereHas('product', fn (Builder $product) => CaseSensitiveSearch::contains(
                    $product,
                    ['products.title', 'products.category'],
                    $term,
                ))->orWhereHas('user', fn (Builder $user) => CaseSensitiveSearch::contains(
                    $user,
                    ['users.name', 'users.email'],
                    $term,
                ))->orWhere(function (Builder $description) use ($term): void {
                    CaseSensitiveSearch::contains($description, ['enquiry.description'], $term);
                });
            });
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        if ($sortBy === 'product_title') {
            $query->join('products as sort_products', 'sort_products.id', '=', 'enquiry.product_id')
                ->select('enquiry.*');
            CaseSensitiveSearch::orderBy($query, 'sort_products.title', $validated['sort_direction'] ?? 'desc');
        } elseif ($sortBy === 'user_name') {
            $query->leftJoin('users as sort_users', 'sort_users.id', '=', 'enquiry.user_id')
                ->select('enquiry.*');
            CaseSensitiveSearch::orderBy($query, 'sort_users.name', $validated['sort_direction'] ?? 'desc');
        } else {
            $direction = $validated['sort_direction'] ?? 'desc';
            if ($sortBy === 'status') {
                CaseSensitiveSearch::orderBy($query, 'enquiry.status', $direction);
            } else {
                $query->orderBy('enquiry.'.$sortBy, $direction);
            }
        }

        $paginator = $query
            ->orderByDesc('enquiry.id')
            ->paginate((int) ($validated['page_size'] ?? Pagination::DefaultPageSize->value))
            ->withQueryString();

        return ApiResponse::success(
            $paginator->getCollection()->map(fn (Enquiry $enquiry): array => [
                'id' => $enquiry->id,
                'description' => $enquiry->description,
                'status' => $enquiry->status->value,
                'admin_remarks' => $enquiry->admin_remarks,
                'created_at' => $enquiry->created_at?->toISOString(),
                'updated_at' => $enquiry->updated_at?->toISOString(),
                'product' => $enquiry->product === null ? null : [
                    'id' => $enquiry->product->id,
                    'title' => $enquiry->product->title,
                    'category' => $enquiry->product->category,
                    'price' => $enquiry->product->price,
                    'image' => $enquiry->product->image,
                ],
                'user' => $enquiry->user === null ? null : [
                    'name' => $enquiry->user->name,
                    'email' => $enquiry->user->email,
                ],
            ])->values(),
            meta: $this->paginationMeta($paginator),
        );
    }

    private function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'has_more_pages' => $paginator->hasMorePages(),
        ];
    }
}
