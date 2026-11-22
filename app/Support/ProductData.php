<?php

namespace App\Support;

use App\Models\Product;

final class ProductData
{
    public static function public(Product $product): array
    {
        return [
            'id' => $product->id,
            'title' => $product->title,
            'description' => $product->description,
            'price' => $product->price,
            'category' => $product->category,
            'image' => $product->image,
            'rating' => $product->rating,
            'is_featured' => $product->is_featured,
            'is_featured_in_category' => $product->is_featured_in_category,
        ];
    }

    public static function admin(Product $product): array
    {
        return [
            ...self::public($product),
            'is_active' => $product->is_active,
            'created_at' => $product->created_at?->toISOString(),
            'updated_at' => $product->updated_at?->toISOString(),
        ];
    }
}
