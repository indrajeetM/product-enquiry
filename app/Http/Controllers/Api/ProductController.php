<?php

namespace App\Http\Controllers\Api;

use App\Enums\Pagination;
use App\Enums\ProductFeatureFlags;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\ApiResponse;
use App\Support\CaseSensitiveSearch;
use App\Support\ProductData;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->where('is_active', true);

        return $this->paginated($request, $query);
    }

    public function featured(Request $request): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true)
            ->where(ProductFeatureFlags::FEATURED, true);

        return $this->paginated($request, $query);
    }

    public function categories(): JsonResponse
    {
        $categories = Product::query()
            ->where('is_active', true)
            ->whereNotNull('category')
            ->pluck('category')
            ->filter(fn (?string $category): bool => $category !== null && $category !== '')
            ->unique()
            ->sort(SORT_STRING)
            ->values();

        return ApiResponse::success($categories);
    }

    public function featuredByCategory(Request $request, string $category): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true)
            ->where(ProductFeatureFlags::CATEGORY_FEATURED, true);
        CaseSensitiveSearch::equals($query, 'products.category', $category);
        $validated = $request->validate([
            'exclude' => ['sometimes', 'integer', 'min:1'],
        ]);
        if (isset($validated['exclude'])) {
            $query->where('products.id', '<>', $validated['exclude']);
        }

        return $this->paginated($request, $query);
    }

    public function byCategory(Request $request, string $category): JsonResponse
    {
        $query = Product::query()->where('is_active', true);
        CaseSensitiveSearch::equals($query, 'products.category', $category);

        return $this->paginated($request, $query);
    }

    public function show(int $product): JsonResponse
    {
        $product = Product::query()
            ->where('is_active', true)
            ->findOrFail($product);

        return ApiResponse::success(ProductData::public($product));
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:120'],
        ]);

        $query = Product::query()->where('is_active', true);
        CaseSensitiveSearch::contains($query, [
            'products.title',
            'products.category',
            'products.description',
            CaseSensitiveSearch::textCast('products.price'),
        ], $validated['q']);

        return $this->paginated($request, $query);
    }

    private function paginated(Request $request, Builder $query): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:'.Pagination::MaximumPageSize->value],
            'sort_by' => ['sometimes', Rule::in(['id', 'title', 'price'])],
            'sort_direction' => ['sometimes', Rule::in(['asc', 'desc'])],
        ]);

        $sortBy = $validated['sort_by'] ?? 'id';
        $direction = $validated['sort_direction'] ?? 'desc';
        $pageSize = (int) ($validated['page_size'] ?? Pagination::DefaultPageSize->value);

        if ($sortBy === 'title') {
            CaseSensitiveSearch::orderBy($query, 'products.title', $direction);
        } else {
            $query->orderBy('products.'.$sortBy, $direction);
        }

        $paginator = $query
            ->when($sortBy !== 'id', fn (Builder $builder) => $builder->orderByDesc('products.id'))
            ->paginate($pageSize)
            ->withQueryString();

        return ApiResponse::success(
            $paginator->getCollection()->map(fn (Product $product): array => ProductData::public($product))->values(),
            meta: [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'has_more_pages' => $paginator->hasMorePages(),
            ],
        );
    }
}
