# Copilot Instructions for zxcvbn-typescript

## Project Overview
This is a TypeScript port of Dan Wheeler's zxcvbn password strength estimation library. The algorithm provides realistic password strength estimation by detecting common patterns, dictionary words, and other weaknesses.

**Critical: The core algorithm must not be changed.** This ensures compatibility with the original zxcvbn and maintains the library's established security properties.

## Code Style & Formatting

### Current State
- ESLint config: `@typescript-eslint/strict` ruleset
- Prettier with double quotes, 2-space indentation, 80 character width, trailing commas
- Target: ES2021, browser environment

### Modernization in Progress
This is an active modernization effort. When suggesting improvements:
- Prefer ES6 module syntax (though CommonJS is still in use during transition)
- Use technologies marked as "Widely Available" in [Baseline](https://web.dev/baseline)
- Consider suggesting migration to Biome (replacing Prettier/ESLint)
- Consider `.editorconfig` standards where appropriate
- Recommend modern build tools and automation improvements

### TypeScript Conventions
- Use explicit return types on all exported functions
- Interfaces prefixed with `I` (e.g., `IMatch`, `IDictionaryMatch`)
- Use TypeScript's type inference for internal variables where clear
- Prefer `const` over `let`, avoid `var`
- Use template literals for string concatenation
- Enable strict type checking (already configured)

### Naming Conventions
- **Functions**: `snake_case` (matching original zxcvbn convention)
- **Variables**: `snake_case` (matching original zxcvbn convention)
- **Interfaces/Types**: `PascalCase` with `I` prefix for interfaces
- **Constants**: `UPPER_SNAKE_CASE` for module-level constants
- **Booleans**: Prefer descriptive names (`reversed`, `l33t`) over `is_*` prefix

### Import Organization
Organize imports in this order:
1. External dependencies (none expected in production code)
2. Internal modules (relative imports)
3. Type imports (if needed separately)

Example:
```typescript
import { IAnyMatch, omnimatch } from "./matching";
import { estimate_attack_times, IAttackTimes } from "./time_estimates";
```

## Dependencies

### Production Dependencies
**Target: Zero external runtime dependencies.** This keeps the library lightweight and minimizes security surface area. Do not suggest adding runtime dependencies.

### Development Dependencies
New dev dependencies are acceptable if they:
- Improve developer experience (DX)
- Enhance security (e.g., better testing, linting)
- Increase robustness (e.g., type checking, validation)
- Support modernization goals (e.g., ES6 module bundling)

When suggesting dev dependencies, explain the benefit clearly.

## Documentation Requirements

### Function Documentation
All functions (public and internal) must have clear documentation including:
- **Purpose**: What the function does
- **Assumptions**: Constraints on inputs (e.g., "password must be lowercase")
- **Parameters**: Describe each parameter's purpose and constraints
- **Returns**: What the function returns and its structure
- **Side effects**: Any state mutations or external dependencies

**Do not duplicate information implicit from TypeScript types.** For example, if a parameter is typed as `string`, don't say "param password - a string". Instead, describe what the string represents or constraints beyond the type.

Good documentation example:
```typescript
/**
 * Attempts to match a string with a ranked dictionary of words.
 *
 * Searches for dictionary words within the password, checking all substrings
 * against available dictionaries. Assumes password comparisons are case-insensitive.
 *
 * @param password - The string to examine for dictionary matches
 * @param _ranked_dictionaries - For unit testing only: allows overriding the available dictionaries
 * @returns Array of dictionary matches found, may be empty
 */
```

Bad documentation example (duplicates TypeScript):
```typescript
/**
 * @param password - a string parameter
 * @param _ranked_dictionaries - a dictionary of ranked dictionaries
 * @returns an array of IDictionaryMatch
 */
```

### Inline Comments
- Explain "why" not "what" (code should be self-documenting for "what")
- Document non-obvious algorithms or calculations
- Explain magic numbers or thresholds
- Reference original zxcvbn behavior when maintaining compatibility

## Testing

### Requirements
- Use Jest for all testing
- New features require corresponding tests
- Changes to existing functions should update related tests
- Test files mirror source structure: `src/matching/date_match.ts` → `test/matching/date_match.test.ts`

### Test Coverage
- Aim for high coverage on new code
- Test edge cases (empty strings, boundary values, special characters)
- Test pattern-matching functions with diverse inputs
- Include performance-sensitive tests where relevant (this is a performance-critical library)

### Test Style
- Descriptive test names explaining what is being tested
- Follow existing patterns in test files
- Use test data from `test/test-support.ts` where applicable

## Architecture & Patterns

### Module Structure
- `src/matching/`: Pattern detection (dictionary, spatial, repeat, etc.)
- `src/scoring/`: Guess estimation for each pattern type
- `src/adjacency_graphs.ts`: Keyboard layout data
- `src/frequency_lists.ts`: Dictionary data
- `src/feedback.ts`: User feedback generation
- `src/time_estimates.ts`: Attack time calculations

### Key Principles
1. **Stateless by default**: Most functions should be pure
2. **Exception**: `set_user_input_dictionary()` manages per-request state
3. **Performance matters**: This library may run on every keystroke
4. **Algorithm fidelity**: Match original zxcvbn behavior unless explicitly modernizing

### Data Files
- Frequency lists (`data/*.txt`) may change in future updates
- Adjacency graphs may be updated for new keyboard layouts
- Scripts in `data-scripts/` generate these files

## Build & Release

### Build Process (Modernization Target)
Current build outputs:
- `lib/`: CommonJS modules (via `tsc`)
- `dist/`: Browserify bundle (UMD, uglified)

Modernization goals:
- ES6 modules in final package
- Better tree-shaking support
- Modern bundler compatibility
- Automated build process improvements

### Versioning & Changelog
- Use [Conventional Commits](https://www.conventionalcommits.org/)
- Changelog managed by commitizen (`npm run commit`)
- Automation of changelog generation is a work-in-progress
- Husky enforces pre-commit hooks (lint-staged)

Commit message format:
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Security Considerations

### Password Handling
- Never log passwords or user inputs
- Assume inputs may contain sensitive data
- Keep timing consistent where possible (avoid timing attacks)

### Algorithm Integrity
- Pattern detection must be thorough
- Guess estimations should err on the conservative side (lower guesses = stronger perceived password = bad for attacker, good for user)
- Don't introduce shortcuts that could weaken estimates

## Common Patterns in This Codebase

### Match Objects
All match types extend `IMatch`:
```typescript
interface IMatch {
  pattern: string;  // match type identifier
  token: string;    // the matched substring
  i: number;        // start index
  j: number;        // end index (inclusive)
}
```

### Scoring Pattern
Each matcher has a corresponding scorer:
- `matching/dictionary_match.ts` → `scoring/dictionary_guesses.ts`
- Match detects the pattern, scorer estimates guesses needed to crack it

### Testing Pattern Matchers
Use `check_matches` helper from `test/test-support.ts`:
```typescript
check_matches(password, pattern_matcher, expected_matches, description);
```

## Modernization Roadmap

When suggesting improvements, align with these goals:
- [ ] Migrate to Biome from ESLint/Prettier
- [ ] Add .editorconfig for cross-editor consistency
- [ ] ES6 modules in published package
- [ ] Improve build automation
- [ ] Automate changelog generation
- [ ] Adopt Baseline "Widely Available" web standards
- [ ] Modern bundler optimization (tree-shaking, etc.)
- [ ] Update to latest TypeScript features

## Questions to Ask

Before implementing changes, consider:
- Does this change the algorithm behavior? (If yes, reconsider unless explicitly modernizing)
- Does this add runtime dependencies? (If yes, find zero-dependency alternative)
- Does this affect performance? (If yes, consider if worth it)
- Is this compatible with the modernization goals?
- Will this work in browser environments? (This is a browser-first library)

## Additional Resources

- Original zxcvbn: https://github.com/dropbox/zxcvbn
- Web Platform Baseline: https://web.dev/baseline
- Conventional Commits: https://www.conventionalcommits.org/
