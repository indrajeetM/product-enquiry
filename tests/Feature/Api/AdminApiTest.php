<?php

use App\Enums\ApiMessage;
use App\Models\Enquiry;
use App\Models\Product;
use App\Models\User;

function makeAdminUser(): User
{
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();

    return $admin;
}

test('admin endpoints reject guests, inactive users, and non-admins', function () {
    $this->getJson('/api/admin/users')->assertUnauthorized();

    $inactiveAdmin = makeAdminUser();
    $inactiveAdmin->forceFill(['is_active' => false])->save();
    $this->actingAs($inactiveAdmin)->getJson('/api/admin/users')->assertForbidden();

    $this->actingAs(User::factory()->create())->getJson('/api/admin/users')->assertForbidden();
});

test('admin user list can filter role and does not expose user ids', function () {
    $admin = makeAdminUser();
    $normal = User::factory()->create([
        'name' => 'Ordinary Person',
        'email' => 'ordinary@example.test',
    ]);

    $response = $this->actingAs($admin)->getJson('/api/admin/users?is_admin=0&q=Ordinary');

    $response->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Ordinary Person')
        ->assertJsonMissingPath('data.0.id')
        ->assertJsonMissingPath('data.0.password');
});

test('admin can change account activity without exposing a user id', function () {
    $admin = makeAdminUser();
    $user = User::factory()->create(['email' => 'inactive@example.test']);

    $this->actingAs($admin)
        ->patchJson('/api/admin/users/active', [
            'email' => $user->email,
            'is_active' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.is_active', false)
        ->assertJsonMissingPath('data.id');

    expect($user->fresh()->is_active)->toBeFalse();

    $this->patchJson('/api/admin/users/active', [
        'email' => $admin->email,
        'is_active' => false,
    ])->assertStatus(409);

    expect($admin->fresh()->is_active)->toBeTrue();

    $this->actingAs($user->fresh())->getJson('/api/enquiries')->assertForbidden();

    $this->actingAs($admin)->patchJson('/api/admin/users/active', [
        'email' => $user->email,
        'is_active' => true,
    ])->assertOk()->assertJsonPath('data.is_active', true);

    $this->actingAs($user->fresh())->getJson('/api/enquiries')->assertOk();
});

test('admin product search is case-sensitive and filters by flags', function () {
    $admin = makeAdminUser();
    Product::factory()->create(['title' => 'Wireless speaker', 'is_featured' => true]);
    Product::factory()->create(['title' => 'wireless mouse', 'is_featured' => true]);

    $this->actingAs($admin)->getJson('/api/admin/products?q=Wireless&is_featured=1')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.title', 'Wireless speaker');
});

test('admin can update product feature flags and cannot feature a product with no category', function () {
    $admin = makeAdminUser();
    $product = Product::factory()->create([
        'category' => 'electronics',
        'is_featured' => false,
        'is_featured_in_category' => false,
    ]);

    $this->actingAs($admin)
        ->patchJson("/api/admin/products/{$product->id}", [
            'is_featured' => true,
            'is_featured_in_category' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data.is_featured', true)
        ->assertJsonPath('data.is_featured_in_category', true);

    expect($product->fresh()->is_featured)->toBeTrue()
        ->and($product->fresh()->is_featured_in_category)->toBeTrue();

    $this->getJson('/api/products/featured')
        ->assertOk()
        ->assertJsonPath('data.0.id', $product->id);
    $this->getJson('/api/categories/electronics/featured')
        ->assertOk()
        ->assertJsonPath('data.0.id', $product->id);

    $uncategorized = Product::factory()->create(['category' => null]);
    $this->patchJson("/api/admin/products/{$uncategorized->id}", [
        'is_featured' => true,
        'is_featured_in_category' => true,
    ])->assertUnprocessable();
});

test('admin enquiry search includes related product fields but omits user ids', function () {
    $admin = makeAdminUser();
    $user = User::factory()->create(['name' => 'Casey Customer']);
    $product = Product::factory()->create(['title' => 'Camera tripod']);
    Enquiry::query()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'description' => 'Please send details.',
        'status' => 'pending',
        'pending_key' => $user->id.':'.$product->id,
    ]);

    $this->actingAs($admin)->getJson('/api/admin/enquiries?q=Camera')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.product.title', 'Camera tripod')
        ->assertJsonPath('data.0.user.email', $user->email)
        ->assertJsonMissingPath('data.0.user.id')
        ->assertJsonMissingPath('data.0.user_id');
});

test('update URLs reject GET with a method-specific API error', function () {
    $this->getJson('/api/admin/enquiries/1')
        ->assertStatus(405)
        ->assertJsonPath('message', ApiMessage::MethodNotAllowed->value)
        ->assertHeader('Allow', 'PATCH');
});
