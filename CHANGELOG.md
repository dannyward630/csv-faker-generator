# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `--seed` / `-s` CLI flag and `seed` programmatic option in `GenerateOptions` for reproducible output via Faker PRNG seeding (#6).

## [2.1.0] - 2026-10-20

### Added
- JSON and NDJSON output formats for the programmatic API (`format` option) and CLI (`--format` / `-f`), inferred from `.json` / `.ndjson` output extensions when not specified. Thanks [@shubhambaghel34](https://github.com/shubhambaghel34)! (#10)

## [2.0.1] - 2026-10-20

### Fixed
- `number` type now honours `0` as `min` or `max` (previously an explicit `0` fell back to the default). (#4)

### Added
- MIT `LICENSE` file. (#1)
- Test suite (`node:test`) and GitHub Actions CI on Node 20, 22, and 24. (#2)
- `CONTRIBUTING.md` guide. (#5)

### Changed
- Published package no longer includes the `example` and `test-advanced` demo scripts.

## [2.0.0] - 2025-12-02

### Added
- `alphanumeric` type with `length` and `uppercase` options.
- `pick` type that selects from a custom `values` array.
- `formula` type for calculated columns that can reference any other column in the row.
- `decimals` option for the `number` type.
- Custom field delimiter (`delimiter` option, `--delimiter` / `-d` CLI flag), including `\t` for tab.

### Changed
- CLI help now lists every supported data type (`title`, `secondaryAddress`, `iban`, `bic`, `bankName`, `alphanumeric`, `pick`).

## [1.0.0] - 2025-11-27

### Added
- Initial release: CLI (`csv-faker`) and programmatic `generateCSV` API with Faker-backed data types.

[Unreleased]: https://github.com/manojkken/csv-faker-generator/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/manojkken/csv-faker-generator/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/manojkken/csv-faker-generator/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/manojkken/csv-faker-generator/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/manojkken/csv-faker-generator/releases/tag/v1.0.0
