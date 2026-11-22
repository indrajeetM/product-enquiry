<?php

use App\Models\Product;

test('public featured products are paginated and exclude inactive products', function () {
    Product::factory()->create(['title' => 'Featured active', 'is_featured' => true]);
    Product::factory()->create(['title' => 'Another featured', 'is_featured' => true]);
    Product::factory()->create(['title' => 'Inactive featured', 'is_featured' => true, 'is_active' => false]);
    Product::factory()->create(['title' => 'Not featured']);

    $response = $this->getJson('/api/products/featured?page_size=1');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('meta.per_page', 1)
        ->assertJsonPath('meta.total', 2)
        ->assertJsonCount(1, 'data')
        ->assertJsonMissing(['title' => 'Inactive featured']);
});

test('public categories are unique case-sensitively and omit null categories', function () {
    Product::factory()->create(['category' => 'Mens clothing']);
    Product::factory()->create(['category' => 'mens clothing']);
    Product::factory()->create(['category' => 'Mens clothing']);
    Product::factory()->create(['category' => null]);

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertJsonPath('data', ['Mens clothing', 'mens clothing']);
});

test('public search is case-sensitive across product text', function () {
    Product::factory()->create(['title' => 'Leather wallet']);

    $this->getJson('/api/products/search?q=Leather')
        ->assertOk()
        ->assertJsonPath('meta.total', 1);

    $this->getJson('/api/products/search?q=leather')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('inactive products are not publicly available by id', function () {
    $product = Product::factory()->create(['is_active' => false]);

    $this->getJson("/api/products/{$product->id}")
        ->assertNotFound()
        ->assertJsonPath('success', false)
        ->assertJsonMissingPath('exception');
});

test('category products match category with exact casing', function () {
    Product::factory()->create(['category' => 'Electronics']);
    Product::factory()->create(['category' => 'electronics']);

    $this->getJson('/api/categories/Electronics/products')
        ->assertOk()
        ->assertJsonPath('meta.total', 1);
});

test('category-featured endpoint can omit the current product', function () {
    $current = Product::factory()->create([
        'category' => 'Home',
        'is_featured_in_category' => true,
    ]);
    Product::factory()->create([
        'category' => 'Home',
        'is_featured_in_category' => true,
    ]);

    $this->getJson("/api/categories/Home/featured?exclude={$current->id}")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonMissing(['id' => $current->id]);
});
