<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class CaseSensitiveSearch
{
    public static function contains(Builder $query, array $columns, string $term): void
    {
        $driver = DB::connection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'sqlite'], true)) {
            throw new RuntimeException('Case-sensitive search is not configured for this database driver.');
        }

        $query->where(function (Builder $nested) use ($columns, $driver, $term): void {
            foreach ($columns as $column) {
                $expression = $driver !== 'sqlite'
                    ? "LOCATE(BINARY ?, BINARY COALESCE($column, '')) > 0"
                    : "instr(COALESCE($column, ''), ?) > 0";

                $nested->orWhereRaw($expression, [$term]);
            }
        });
    }

    public static function equals(Builder $query, string $column, string $value): void
    {
        $driver = DB::connection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'sqlite'], true)) {
            throw new RuntimeException('Case-sensitive search is not configured for this database driver.');
        }

        if ($driver !== 'sqlite') {
            $query->whereRaw("BINARY $column = BINARY ?", [$value]);

            return;
        }

        $query->whereRaw("($column COLLATE BINARY) = ?", [$value]);
    }

    public static function orderBy(Builder $query, string $column, string $direction): void
    {
        if (! in_array($direction, ['asc', 'desc'], true)) {
            throw new RuntimeException('Invalid sort direction.');
        }

        $driver = DB::connection()->getDriverName();

        if (! in_array($driver, ['mysql', 'mariadb', 'sqlite'], true)) {
            throw new RuntimeException('Case-sensitive sorting is not configured for this database driver.');
        }

        if ($driver !== 'sqlite') {
            $query->orderByRaw("BINARY $column $direction");

            return;
        }

        $query->orderByRaw("$column COLLATE BINARY $direction");
    }

    public static function textCast(string $column): string
    {
        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)
            ? "CAST($column AS CHAR)"
            : "CAST($column AS TEXT)";
    }
}
