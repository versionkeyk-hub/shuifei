"""Split a generated SQL seed file without breaking quoted multiline values."""

from __future__ import annotations

import argparse
from pathlib import Path


def statements(sql: str) -> list[str]:
    result: list[str] = []
    start = 0
    index = 0
    in_string = False

    while index < len(sql):
        character = sql[index]
        if character == "'":
            if in_string and index + 1 < len(sql) and sql[index + 1] == "'":
                index += 2
                continue
            in_string = not in_string
        elif character == ";" and not in_string:
            statement = sql[start:index + 1].strip()
            if statement:
                result.append(statement)
            start = index + 1
        index += 1

    remaining = sql[start:].strip()
    if remaining:
        raise ValueError("Seed SQL ends with an incomplete statement")
    if in_string:
        raise ValueError("Seed SQL ends inside a quoted string")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--max-bytes", type=int, default=45_000)
    args = parser.parse_args()

    source = args.input.read_text(encoding="utf-8")
    source_statements = statements(source)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for file in args.output_dir.glob("*.sql"):
        file.unlink()

    batches: list[list[str]] = []
    current: list[str] = []
    current_size = 0
    for statement in source_statements:
        statement_size = len(statement.encode("utf-8")) + 1
        if current and current_size + statement_size > args.max_bytes:
            batches.append(current)
            current = []
            current_size = 0
        current.append(statement)
        current_size += statement_size
    if current:
        batches.append(current)

    for index, batch in enumerate(batches, start=1):
        (args.output_dir / f"{index:03d}.sql").write_text("\n".join(batch) + "\n", encoding="utf-8")

    print({
        "statements": len(source_statements),
        "batches": len(batches),
        "max_bytes": args.max_bytes,
        "largest_statement_bytes": max(len(statement.encode("utf-8")) for statement in source_statements),
    })


if __name__ == "__main__":
    main()
