<?php

use App\Models\Product;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\ProductSeeder;
use Illuminate\Support\Facades\Http;

test('product seeder ignores remote identifiers and is idempotent', function () {
    Http::fake([
        'fakestoreapi.com/products' => Http::response([
            [
                'id' => 999,
                'title' => 'First product',
                'description' => 'First description',
                'price' => 12.5,
                'category' => 'A',
                'image' => 'https://fakestoreapi.com/img/a.jpg',
                'rating' => ['rate' => 4.2, 'count' => 10],
            ],
            [
                'id' => 1000,
                'title' => 'Second product',
                'description' => 'Second description',
                'price' => 10,
                'category' => 'A',
                'image' => 'https://fakestoreapi.com/img/b.jpg',
                'rating' => ['rate' => 3.5, 'count' => 5],
            ],
            [
                'id' => 1001,
                'title' => 'Third product',
                'description' => 'Third description',
                'price' => 20,
                'category' => 'B',
                'image' => 'https://fakestoreapi.com/img/c.jpg',
                'rating' => ['rate' => 4.5, 'count' => 7],
            ],
        ], 200),
    ]);

    app(ProductSeeder::class)->run();
    app(ProductSeeder::class)->run();

    expect(Product::count())->toBe(3)
        ->and(Product::where('title', 'First product')->first()->is_featured)->toBeTrue()
        ->and(Product::where('title', 'First product')->first()->is_featured_in_category)->toBeTrue()
        ->and(Product::where('title', 'Second product')->first()->is_featured_in_category)->toBeFalse()
        ->and(Product::where('title', 'Third product')->first()->is_featured_in_category)->toBeTrue();
});

test('admin seeder requires configured password and creates the admin account', function () {
    config()->set('seeding.admin_password', 'test-only-password');

    app(AdminUserSeeder::class)->run();

    $admin = User::where('email', 'test@gmail.com')->firstOrFail();

    expect($admin->is_admin)->toBeTrue()
        ->and($admin->is_active)->toBeTrue()
        ->and(password_verify('test-only-password', $admin->password))->toBeTrue();
});

test('invalid FakeStore data fails without partially seeding products', function () {
    Http::fake([
        'fakestoreapi.com/products' => Http::response([
            [
                'id' => 999,
                'title' => 'Invalid image host',
                'description' => 'Rejected',
                'price' => 12.5,
                'category' => 'A',
                'image' => 'https://unexpected.example/image.jpg',
                'rating' => ['rate' => 4.2, 'count' => 10],
            ],
        ], 200),
    ]);

    expect(fn () => app(ProductSeeder::class)->run())
        ->toThrow(RuntimeException::class);
    expect(Product::count())->toBe(0);
});

test('admin seeder fails clearly when the environment password is absent', function () {
    config()->set('seeding.admin_password', null);

    expect(fn () => app(AdminUserSeeder::class)->run())
        ->toThrow(RuntimeException::class, 'ADMIN_SEED_PASSWORD');
});
