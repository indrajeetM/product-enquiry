<?php

namespace App\Enums;

enum Pagination: int
{
    case DefaultPageSize = 12;
    case MaximumPageSize = 48;
}
