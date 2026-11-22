<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 1, 1000),
            'category' => fake()->word(),
            'image' => fake()->url(),
            'rating' => ['rate' => fake()->randomFloat(1, 0, 5), 'count' => fake()->numberBetween(0, 1000)],
            'is_active' => true,
            'is_featured' => false,
            'is_featured_in_category' => false,
        ];
    }
}
