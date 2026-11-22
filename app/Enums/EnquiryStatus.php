<?php

namespace App\Enums;

enum EnquiryStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
}
