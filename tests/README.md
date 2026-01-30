# Testing Guide

[Back to main README](../README.md)

This directory contains the ETL pipeline test suite for Agent Mart.

## Running Tests

```bash
# Run all tests (ETL + web)
npm run test:all

# Run only ETL tests
npm test

# Run only web tests
npm run test:web

# Run web tests in watch mode
cd web && npm test
```

## Test Files

| File | Description |
|------|-------------|
| `smoke.test.js` | Basic sanity checks and module loading |
| `pipeline.test.js` | End-to-end pipeline execution tests |
| `data-flow.test.js` | Tests data transformation between stages |
| `data-quality.test.js` | Validates output data quality and completeness |
| `enrich.test.js` | Tests the enrichment stage (06-enrich.js) |
| `categorizer.test.js` | Tests category normalization logic |
| `trending.test.js` | Tests z-score trending algorithm |
| `visualizer.test.js` | Tests the ETL visualizer components |

## Test Patterns

### Unit Tests

Test individual functions in isolation:

```javascript
import { extractCategories } from '../src/lib/categorizer.js';

test('extracts tech stack from description', () => {
  const marketplace = {
    description: 'A Next.js plugin for testing',
    plugins: []
  };
  const result = extractCategories(marketplace);
  expect(result.techStack).toContain('nextjs');
});
```

### Integration Tests

Test pipeline stages with real data:

```javascript
test('pipeline produces valid output', async () => {
  const result = await runPipeline({ repoLimit: 3 });
  expect(result.authors).toBeDefined();
  expect(Object.keys(result.authors).length).toBeGreaterThan(0);
});
```

## Test Data

Tests use fixtures and mocked data where appropriate:
- Mock GitHub API responses for deterministic testing
- Sample marketplace.json files for parser tests
- Pre-generated intermediate files for stage tests

## Frontend Tests

Frontend tests are located in `web/tests/`. See [web/README.md](../web/README.md) for details.

```bash
# Run frontend tests
cd web && npm test

# Run with coverage
cd web && npm run test:coverage
```

## CI Integration

Tests run automatically on:
- Every push to any branch
- Every pull request

See [.github/workflows/README.md](../.github/workflows/README.md) for CI configuration.
