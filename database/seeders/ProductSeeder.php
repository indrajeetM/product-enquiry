<?php

namespace Database\Seeders;

use App\Enums\ProductFeatureFlags;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $response = Http::timeout(10)
            ->retry(3, 250)
            ->get('https://fakestoreapi.com/products')
            ->throw();

        $items = $response->json();

        if (! is_array($items) || $items === []) {
            throw new RuntimeException('FakeStore returned an empty or invalid products response.');
        }

        $products = [];
        $categoryFeatured = [];

        foreach (array_values($items) as $index => $item) {
            if (! is_array($item)) {
                throw new RuntimeException('FakeStore returned a product with an invalid shape.');
            }

            $validator = Validator::make($item, [
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
                'category' => ['required', 'string', 'max:255'],
                'image' => ['required', 'url', 'starts_with:https://', 'max:255'],
                'rating' => ['required', 'array'],
                'rating.rate' => ['required', 'numeric', 'between:0,5'],
                'rating.count' => ['required', 'integer', 'min:0'],
            ]);

            if ($validator->fails()) {
                throw new RuntimeException('FakeStore returned a product with an invalid shape.');
            }
            if (parse_url($item['image'], PHP_URL_HOST) !== 'fakestoreapi.com') {
                throw new RuntimeException('FakeStore returned an image URL outside the expected host.');
            }

            $category = $item['category'];
            $isCategoryFeatured = ! isset($categoryFeatured[$category]);
            $categoryFeatured[$category] = true;

            $products[] = [
                'title' => $item['title'],
                'description' => $item['description'] ?? null,
                'price' => $item['price'],
                'category' => $category,
                'image' => $item['image'],
                'rating' => $item['rating'],
                'is_active' => true,
                ProductFeatureFlags::FEATURED => $index < 4,
                ProductFeatureFlags::CATEGORY_FEATURED => $isCategoryFeatured,
            ];
        }

        DB::transaction(function () use ($products): void {
            foreach ($products as $product) {
                Product::updateOrCreate(
                    ['title' => $product['title'], 'category' => $product['category']],
                    $product,
                );
            }
        });
    }
}
