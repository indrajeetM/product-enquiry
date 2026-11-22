<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $password = config('seeding.admin_password');

        if (! is_string($password) || $password === '') {
            throw new RuntimeException('ADMIN_SEED_PASSWORD must be configured before seeding the admin user.');
        }

        $user = User::firstOrNew(['email' => 'test@gmail.com']);
        $user->name = $user->exists ? $user->name : fake()->name();
        $user->password = $password;
        $user->is_admin = true;
        $user->is_active = true;
        $user->save();
    }
}
