<?php

namespace App\Http\Middleware;

use App\Enums\ApiMessage;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            if (! $request->is('api/*')) {
                abort(401);
            }

            return ApiResponse::error(ApiMessage::Unauthenticated->value, 401);
        }

        if (! $user->is_active) {
            if (! $request->is('api/*')) {
                abort(403);
            }

            return ApiResponse::error(ApiMessage::Forbidden->value, 403);
        }

        return $next($request);
    }
}
