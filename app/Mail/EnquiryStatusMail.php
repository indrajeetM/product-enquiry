<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Log;
use Throwable;

class EnquiryStatusMail extends Mailable implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [60, 300];

    public function __construct(public readonly array $details) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your product enquiry has an update');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.enquiry-status',
            with: ['details' => $this->details],
        );
    }

    public function failed(Throwable $exception): void
    {
        Log::error('Enquiry notification email failed.', [
            'enquiry_id' => $this->details['enquiry_id'] ?? null,
        ]);
    }
}
