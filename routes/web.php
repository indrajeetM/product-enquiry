<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('products', function () {
    return Inertia::render('products/index');
})->name('products.index');

Route::get('products/category/{category}', function (string $category) {
    return Inertia::render('products/index', ['category' => $category]);
})->name('products.category');

Route::get('products/{product}', function (int $product) {
    return Inertia::render('products/show', ['product' => $product]);
})->whereNumber('product')->name('products.show');

Route::get('search', function (Request $request) {
    $validated = $request->validate([
        'q' => ['required', 'string', 'min:1', 'max:120'],
    ]);

    return Inertia::render('search', ['q' => $validated['q']]);
})->name('products.search');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        if ($request->user()->is_admin) {
            return redirect()->route('admin.dashboard');
        }

        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('enquiries', function () {
        return Inertia::render('enquiries/index');
    })->middleware('active.user')->name('enquiries.index');

    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
        Route::get('/', function () {
            return Inertia::render('admin/dashboard', ['activeTab' => 'overview']);
        })->name('dashboard');

        Route::get('users', function () {
            return Inertia::render('admin/dashboard', ['activeTab' => 'users']);
        })->name('users');

        Route::get('products', function () {
            return Inertia::render('admin/dashboard', ['activeTab' => 'products']);
        })->name('products');

        Route::get('enquiries', function () {
            return Inertia::render('admin/dashboard', ['activeTab' => 'enquiries']);
        })->name('enquiries');
    });
});

Route::prefix('api')->name('api.')->group(function () {
    Route::get('products', [ProductController::class, 'index'])->name('products.index');
    Route::get('products/featured', [ProductController::class, 'featured'])->name('products.featured');
    Route::get('products/search', [ProductController::class, 'search'])->name('products.search');
    Route::get('products/{product}', [ProductController::class, 'show'])->whereNumber('product')->name('products.show');
    Route::get('categories', [ProductController::class, 'categories'])->name('categories.index');
    Route::get('categories/{category}/featured', [ProductController::class, 'featuredByCategory'])->name('categories.featured');
    Route::get('categories/{category}/products', [ProductController::class, 'byCategory'])->name('categories.products');

    Route::middleware('active.user')->group(function () {
        Route::post('enquiries', [EnquiryController::class, 'store'])
            ->middleware('throttle:enquiry-submit')
            ->name('enquiries.store');
        Route::get('enquiries', [EnquiryController::class, 'mine'])->name('enquiries.mine');
    });

    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function () {
        Route::patch('users/active', [AdminController::class, 'updateUserStatus'])->name('users.update-status');
        Route::get('users', [AdminController::class, 'users'])->name('users.index');
        Route::patch('products/{product}', [AdminController::class, 'updateProductFeatures'])
            ->whereNumber('product')
            ->name('products.update-features');
        Route::get('products', [AdminController::class, 'products'])->name('products.index');
        Route::get('categories', [AdminController::class, 'categories'])->name('categories.index');
        Route::get('enquiries', [AdminController::class, 'enquiries'])->name('enquiries.index');
        Route::patch('enquiries/{enquiry}', [EnquiryController::class, 'updateStatus'])
            ->whereNumber('enquiry')
            ->middleware('throttle:admin-write')
            ->name('enquiries.update-status');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
