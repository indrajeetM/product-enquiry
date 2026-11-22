<?php

use App\Enums\ApiMessage;
use App\Enums\EnquiryStatus;
use App\Mail\EnquiryStatusMail;
use App\Models\Enquiry;
use App\Models\Product;
use App\Models\User;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;

test('guests cannot submit or view enquiries', function () {
    $product = Product::factory()->create();

    $this->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'Please contact me.',
    ])->assertUnauthorized()->assertJsonPath('success', false);

    $this->getJson('/api/enquiries')
        ->assertUnauthorized()
        ->assertJsonPath('success', false);
});

test('inactive users cannot submit enquiries', function () {
    $user = User::factory()->create();
    $user->forceFill(['is_active' => false])->save();
    $product = Product::factory()->create();

    $this->actingAs($user)->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'Please contact me.',
    ])->assertForbidden();
});

test('enquiry creation derives the user from the session and queues a status email', function () {
    Mail::fake();
    $user = User::factory()->create();
    expect($user->is_active)->toBeTrue();
    $product = Product::factory()->create(['title' => 'Desk lamp', 'category' => 'Home']);

    $response = $this->actingAs($user)->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'I would like details.',
        'user_id' => 99999,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.status', EnquiryStatus::Pending->value)
        ->assertJsonMissingPath('data.user_id');

    $enquiry = Enquiry::firstOrFail();
    expect($enquiry->user_id)->toBe($user->id)
        ->and($enquiry->pending_key)->toBe($user->id.':'.$product->id);

    Mail::assertQueued(EnquiryStatusMail::class, function (EnquiryStatusMail $mail) use ($user): bool {
        expect($mail->details['product_title'])->toBe('Desk lamp')
            ->and($mail->details['description'])->toBe('I would like details.')
            ->and($mail->details['status'])->toBe('pending')
            ->and($mail->details['admin_remarks'])->toBeNull();

        return $mail->hasTo($user->email);
    });
});

test('a user may submit again only after the previous enquiry is completed', function () {
    Mail::fake();
    $this->withoutMiddleware(ThrottleRequests::class);
    $user = User::factory()->create();
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();
    $product = Product::factory()->create();

    $this->actingAs($user)->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'First enquiry',
    ])->assertCreated();

    $first = Enquiry::firstOrFail();
    $this->actingAs($admin)->patchJson("/api/admin/enquiries/{$first->id}", [
        'status' => 'completed',
        'admin_remarks' => 'Completed successfully.',
    ])->assertOk();

    Mail::assertQueued(EnquiryStatusMail::class, 2);
    Mail::assertQueued(EnquiryStatusMail::class, function (EnquiryStatusMail $mail) use ($user): bool {
        return $mail->hasTo($user->email)
            && $mail->details['status'] === 'completed'
            && $mail->details['admin_remarks'] === 'Completed successfully.';
    });

    $this->actingAs($user)->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'A later enquiry',
    ])->assertCreated();

    expect(Enquiry::where('product_id', $product->id)->count())->toBe(2);
});

test('completed enquiries cannot be updated again by an admin', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();
    $user = User::factory()->create();
    $product = Product::factory()->create();
    $enquiry = Enquiry::query()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'description' => 'Please send details.',
        'status' => EnquiryStatus::Completed,
        'admin_remarks' => 'Already completed.',
    ]);

    $this->actingAs($admin)->patchJson("/api/admin/enquiries/{$enquiry->id}", [
        'status' => 'pending',
        'admin_remarks' => 'Reopen this enquiry.',
    ])->assertStatus(409)
        ->assertJsonPath('message', ApiMessage::StateConflict->value);

    $this->patchJson("/api/admin/enquiries/{$enquiry->id}", [
        'status' => 'completed',
        'admin_remarks' => 'Change the completed remark.',
    ])->assertStatus(409)
        ->assertJsonPath('message', ApiMessage::StateConflict->value);

    expect($enquiry->fresh()->status)->toBe(EnquiryStatus::Completed)
        ->and($enquiry->fresh()->admin_remarks)->toBe('Already completed.');
});

test('a second pending enquiry is rejected and descriptions are length limited', function () {
    Mail::fake();
    $this->withoutMiddleware(ThrottleRequests::class);
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $payload = ['product_id' => $product->id, 'description' => 'First enquiry'];
    $this->actingAs($user)->postJson('/api/enquiries', $payload)->assertCreated();
    $this->postJson('/api/enquiries', $payload)->assertStatus(409)->assertJsonPath('success', false);

    $this->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => str_repeat('x', 2001),
    ])->assertUnprocessable()->assertJsonPath('success', false);
});

test('enquiry submission is rate limited per signed-in user', function () {
    Mail::fake();
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'First enquiry',
    ])->assertCreated();

    $this->postJson('/api/enquiries', [
        'product_id' => $product->id,
        'description' => 'Second request',
    ])->assertTooManyRequests()->assertHeader('Retry-After');
});

test('a user sees only their own enquiries in latest-first order', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $product = Product::factory()->create();
    $older = Enquiry::query()->create([
        'product_id' => $product->id,
        'user_id' => $user->id,
        'description' => 'Older enquiry',
        'status' => EnquiryStatus::Pending,
        'pending_key' => $user->id.':'.$product->id,
    ]);
    $newerProduct = Product::factory()->create();
    $newer = Enquiry::query()->create([
        'product_id' => $newerProduct->id,
        'user_id' => $user->id,
        'description' => 'Newer enquiry',
        'status' => EnquiryStatus::Completed,
    ]);
    Enquiry::query()->create([
        'product_id' => $product->id,
        'user_id' => $otherUser->id,
        'description' => 'Someone else',
        'status' => EnquiryStatus::Pending,
        'pending_key' => $otherUser->id.':'.$product->id,
    ]);

    $this->actingAs($user)->getJson('/api/enquiries')
        ->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonMissingPath('data.0.user_id');
});
