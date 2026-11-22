<?php

namespace App\Enums;

enum ApiMessage: string
{
    case Success = 'Request completed successfully.';
    case Unauthenticated = 'Authentication is required.';
    case Forbidden = 'You are not authorized to perform this action.';
    case NotFound = 'The requested resource was not found.';
    case ValidationFailed = 'The provided data is invalid.';
    case RequestFailed = 'The request could not be completed.';
    case MethodNotAllowed = 'The HTTP method is not allowed for this endpoint.';
    case TooManyRequests = 'Too many requests. Please try again later.';
    case InternalServerError = 'An internal error occurred.';
    case ProductUnavailable = 'The product is unavailable.';
    case DuplicatePendingEnquiry = 'A pending enquiry already exists for this product.';
    case StateConflict = 'The request conflicts with the current resource state.';
}
