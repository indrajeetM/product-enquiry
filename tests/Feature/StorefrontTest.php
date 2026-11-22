<?php

use App\Models\Enquiry;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('storefront pages render without authentication and use only safe auth props', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('welcome'));

    $user = User::factory()->create();
    $this->actingAs($user)->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('auth.user.name', $user->name)
            ->missing('auth.user.id'));
});

test('catalog, category, search, and product detail pages are public', function () {
    $product = Product::factory()->create();

    $this->get('/products')->assertOk()->assertInertia(fn (Assert $page) => $page->component('products/index'));
    $this->get('/products/category/'.rawurlencode($product->category))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('products/index')->where('category', $product->category));
    $this->get('/search?q=chair')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('search')->where('q', 'chair'));
    $this->get("/products/{$product->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('products/show')->where('product', $product->id));
});

test('deleting a user preserves their enquiry and detaches the account', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $enquiry = Enquiry::query()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'description' => 'Please send details.',
        'status' => 'pending',
        'pending_key' => $user->id.':'.$product->id,
    ]);

    $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])
        ->assertRedirect('/');

    expect($user->fresh())->toBeNull()
        ->and($enquiry->fresh()->user_id)->toBeNull()
        ->and($enquiry->fresh())->not->toBeNull();
});
