<?php

namespace App\Support;

use App\Enums\ApiMessage;
use Illuminate\Http\JsonResponse;

final class ApiResponse
{
    public static function success(
        mixed $data,
        string $message = ApiMessage::Success->value,
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            ...($meta === [] ? [] : ['meta' => $meta]),
        ], $status);
    }

    public static function error(
        string $message,
        int $status,
        array $errors = [],
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            ...($errors === [] ? [] : ['errors' => $errors]),
        ], $status);
    }
}
