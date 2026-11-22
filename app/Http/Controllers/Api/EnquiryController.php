<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApiMessage;
use App\Enums\EnquiryStatus;
use App\Enums\Pagination;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnquiryRequest;
use App\Mail\EnquiryStatusMail;
use App\Models\Enquiry;
use App\Models\Product;
use App\Support\ApiResponse;
use App\Support\ProductData;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class EnquiryController extends Controller
{
    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $product = Product::query()->findOrFail($validated['product_id']);
        $pendingKey = $user->getAuthIdentifier().':'.$product->getKey();

        try {
            $enquiry = DB::transaction(function () use ($validated, $user, $pendingKey): Enquiry {
                return Enquiry::query()->create([
                    'product_id' => $validated['product_id'],
                    'user_id' => $user->getAuthIdentifier(),
                    'description' => $validated['description'],
                    'status' => EnquiryStatus::Pending,
                    'pending_key' => $pendingKey,
                ]);
            });
        } catch (QueryException $exception) {
            if (Enquiry::query()->where('pending_key', $pendingKey)->exists()) {
                return ApiResponse::error(ApiMessage::DuplicatePendingEnquiry->value, 409);
            }

            throw $exception;
        }

        $enquiry->load('product');
        Mail::to($user->email)->queue(
            (new EnquiryStatusMail($this->mailDetails($enquiry, EnquiryStatus::Pending)))
                ->afterCommit(),
        );

        return ApiResponse::success($this->userEnquiryData($enquiry), status: 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'page_size' => ['sometimes', 'integer', 'min:1', 'max:'.Pagination::MaximumPageSize->value],
        ]);

        $paginator = Enquiry::query()
            ->where('user_id', $request->user()->getAuthIdentifier())
            ->with('product:id,title,category,price,image')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate((int) ($validated['page_size'] ?? Pagination::DefaultPageSize->value))
            ->withQueryString();

        return ApiResponse::success(
            $paginator->getCollection()->map(fn (Enquiry $enquiry): array => $this->userEnquiryData($enquiry))->values(),
            meta: [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'has_more_pages' => $paginator->hasMorePages(),
            ],
        );
    }

    public function updateStatus(Request $request, Enquiry $enquiry): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(EnquiryStatus::class)],
            'admin_remarks' => ['required', 'string', 'max:255'],
        ]);

        $newStatus = EnquiryStatus::from($validated['status']);
        $pendingKey = $enquiry->user_id === null
            ? null
            : $enquiry->user_id.':'.$enquiry->product_id;

        try {
            [$enquiry, $sendCompletionEmail] = DB::transaction(function () use ($enquiry, $newStatus, $validated, $pendingKey): array {
                $locked = Enquiry::query()->lockForUpdate()->findOrFail($enquiry->getKey());

                if ($locked->status === EnquiryStatus::Completed) {
                    return [null, false];
                }

                $locked->status = $newStatus;
                $locked->admin_remarks = $validated['admin_remarks'];
                $locked->pending_key = $newStatus === EnquiryStatus::Pending ? $pendingKey : null;
                $locked->save();

                return [
                    $locked->load(['product', 'user']),
                    $newStatus === EnquiryStatus::Completed,
                ];
            });
        } catch (QueryException $exception) {
            if ($newStatus === EnquiryStatus::Pending && $pendingKey !== null && Enquiry::query()->where('pending_key', $pendingKey)->exists()) {
                return ApiResponse::error(ApiMessage::StateConflict->value, 409);
            }

            throw $exception;
        }

        if ($enquiry === null) {
            return ApiResponse::error(ApiMessage::StateConflict->value, 409);
        }

        if ($sendCompletionEmail && $enquiry->user !== null) {
            Mail::to($enquiry->user->email)->queue(
                (new EnquiryStatusMail($this->mailDetails($enquiry, EnquiryStatus::Completed)))
                    ->afterCommit(),
            );
        }

        return ApiResponse::success($this->adminEnquiryData($enquiry));
    }

    private function userEnquiryData(Enquiry $enquiry): array
    {
        return [
            'id' => $enquiry->id,
            'description' => $enquiry->description,
            'status' => $enquiry->status->value,
            'admin_remarks' => $enquiry->admin_remarks,
            'created_at' => $enquiry->created_at?->toISOString(),
            'product' => $enquiry->product === null ? null : ProductData::public($enquiry->product),
        ];
    }

    private function adminEnquiryData(Enquiry $enquiry): array
    {
        return [
            ...$this->userEnquiryData($enquiry),
            'updated_at' => $enquiry->updated_at?->toISOString(),
            'user' => $enquiry->user === null ? null : [
                'name' => $enquiry->user->name,
                'email' => $enquiry->user->email,
            ],
        ];
    }

    private function mailDetails(Enquiry $enquiry, EnquiryStatus $status): array
    {
        return [
            'enquiry_id' => $enquiry->id,
            'product_title' => $enquiry->product->title,
            'category' => $enquiry->product->category,
            'price' => $enquiry->product->price,
            'description' => $enquiry->description,
            'status' => $status->value,
            'admin_remarks' => $status === EnquiryStatus::Completed ? $enquiry->admin_remarks : null,
        ];
    }
}
