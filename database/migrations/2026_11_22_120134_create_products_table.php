<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('category', 255)->nullable();
            $table->string('image', 255)->nullable();
            $table->json('rating')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_featured_in_category')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'is_featured', 'id']);
            $table->index(['category', 'is_active', 'is_featured_in_category', 'id']);
            $table->index(['category', 'is_active', 'id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
