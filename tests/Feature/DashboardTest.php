<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('customers can visit their enquiry history', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/enquiries')->assertOk();
});

test('admins are sent to their management dashboard', function () {
    $admin = User::factory()->create();
    $admin->forceFill(['is_admin' => true])->save();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertRedirect('/admin');

    $this->get('/admin')->assertOk();
});

test('customers cannot visit admin screens', function () {
    $this->actingAs(User::factory()->create())
        ->get('/admin/enquiries')
        ->assertForbidden();
});

test('guests must authenticate before visiting the enquiry history', function () {
    $this->get('/enquiries')->assertRedirect('/login');
});
