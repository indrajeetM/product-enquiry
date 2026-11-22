<?php

use App\Enums\ApiMessage;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.user' => EnsureActiveUser::class,
            'admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($exception instanceof ValidationException) {
                return ApiResponse::error(
                    ApiMessage::ValidationFailed->value,
                    422,
                    $exception->errors(),
                );
            }

            if ($exception instanceof AuthenticationException) {
                return ApiResponse::error(ApiMessage::Unauthenticated->value, 401);
            }

            if ($exception instanceof AuthorizationException) {
                return ApiResponse::error(ApiMessage::Forbidden->value, 403);
            }

            if ($exception instanceof ModelNotFoundException || $exception instanceof NotFoundHttpException) {
                return ApiResponse::error(ApiMessage::NotFound->value, 404);
            }

            if ($exception instanceof MethodNotAllowedHttpException) {
                $response = ApiResponse::error(ApiMessage::MethodNotAllowed->value, 405);
                $allowedMethods = $exception->getHeaders()['Allow'] ?? '';

                if ($allowedMethods !== '') {
                    $response->header('Allow', $allowedMethods);
                }

                return $response;
            }

            if ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() === 429) {
                return ApiResponse::error(
                    ApiMessage::TooManyRequests->value,
                    429,
                )->header('Retry-After', $exception->getHeaders()['Retry-After'] ?? '60');
            }

            if ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() >= 400 && $exception->getStatusCode() < 500) {
                return ApiResponse::error(
                    $exception->getStatusCode() === 404
                        ? ApiMessage::NotFound->value
                        : ApiMessage::RequestFailed->value,
                    $exception->getStatusCode(),
                );
            }

            report($exception);

            return ApiResponse::error(ApiMessage::InternalServerError->value, 500);
        });
    })->create();
