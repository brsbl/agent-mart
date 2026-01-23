# Contributing to Agent Mart

Thank you for your interest in contributing to Agent Mart! This document provides guidelines for contributing to the project.

## How to Contribute

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Test your changes** by running the test suite
4. **Submit a pull request** with a clear description of the changes

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm
- A GitHub Personal Access Token with `public_repo` scope

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/agent-mart.git
cd agent-mart

# Install dependencies for the pipeline
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your GITHUB_TOKEN

# Run tests to verify setup
npm test

# Run the pipeline (with limited repos for testing)
REPO_LIMIT=3 npm run pipeline
```

### Frontend Development

```bash
cd web
npm install
npm run dev
```

## Code Style Guidelines

### General

- Use ES modules (`import`/`export`)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Keep functions focused and small

### JavaScript (Pipeline)

- Follow the existing ESLint configuration
- Run `npm run lint` before committing
- Use `npm run lint:fix` to auto-fix issues

### TypeScript (Frontend)

- Use TypeScript for all new frontend code
- Define proper interfaces for props and data
- Avoid `any` types where possible

### Formatting

- 2 spaces for indentation
- Single quotes for strings
- Semicolons at end of statements
- Trailing commas in multi-line arrays/objects

## Pull Request Process

1. **Update documentation** if you change any public APIs or add features
2. **Add tests** for new functionality
3. **Run the full test suite** with `npm test`
4. **Run linting** with `npm run lint`
5. **Keep PRs focused** - one feature or fix per PR
6. **Write clear commit messages** describing what and why

### PR Title Format

Use descriptive titles that indicate the type of change:

- `feat: add new marketplace search feature`
- `fix: correct rate limiting calculation`
- `docs: update installation instructions`
- `refactor: simplify cache validation logic`
- `test: add tests for validator edge cases`

### PR Description

Include:
- What the PR does
- Why the change is needed
- How to test the changes
- Any breaking changes

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --test-reporter=spec
```

### Writing Tests

- Place tests in the `tests/` directory
- Use Node.js built-in test runner
- Test both happy paths and error cases
- Mock external dependencies (GitHub API)

## Project Structure

```
src/
├── lib/           # Shared utilities
│   ├── github.js  # GitHub API client
│   ├── cache.js   # File-based caching
│   ├── parser.js  # JSON/YAML parsing
│   └── validator.js
└── pipeline/      # ETL steps
    ├── 01-discover.js
    ├── 02-fetch-repos.js
    └── ...

web/
├── src/
│   ├── app/       # Next.js pages
│   ├── components/
│   └── lib/       # Frontend utilities
```

## Reporting Issues

When reporting bugs, please include:

- A clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- Relevant error messages or logs

## Questions?

If you have questions about contributing, feel free to open an issue with the `question` label.
