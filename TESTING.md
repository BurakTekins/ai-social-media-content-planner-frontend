# Automated testing

## Audit (2026-10-31)

Audited base commit: `7bab3b298aef26530842e39311c4d0ac4b1619bf`.

React 19, Vite 7, Tailwind 4, pnpm 11, page components with a centralized fetch API
client and Turkish/English localization. There were no test scripts, test files,
test dependencies, or checked-in CI workflows. The existing Vite production
configuration and pnpm lockfile/package-manager choice were retained.

## Added or repaired tests

- `src/api.test.js`: scheduling JSON/identifier encoding, repeated filters and absent values, 204 responses, localized 409 metadata, HTML error sanitization, network causes, cancellation (7 cases).
- `src/pages/SettingsPage.test.jsx`: pending load, minutes-to-seconds save conversion and pending-save disabling, native form limits preventing a request, load error/retry, failed-save edit preservation (5 cases).
- Tests use the real I18nProvider and DOM behavior. Settings API calls are mocked at the service boundary; API-client tests stub fetch and inspect actual requests/responses.

## Running the suite

New development dependencies: Vitest 3.2.7, React Testing Library 16.3.3,
user-event 14.6.8, jest-dom 7.0.1, jsdom 30.1.3 (exact resolutions in pnpm-lock.yaml).
These provide the runner, DOM rendering/assertions, realistic interactions, and DOM
environment. No production dependencies were added.
Node 24 and the packageManager-pinned pnpm 11.20.0 were used.
Run `pnpm install --frozen-lockfile`, then `pnpm test`.
Watch mode: `pnpm test:watch`. CI generates a JUnit report via
`pnpm test --reporter=default --reporter=junit --outputFile=test-results/junit.xml`.
The frozen install and CI test command were executed successfully locally.

## Verified result (2026-10-31)

12 tests executed, 12 passed, 0 failures, 0 errors, 0 skipped.
12 cases were added in this change. Results come from actual local execution,
not an inferred GitHub Actions result.

## CI

`.github/workflows/tests.yml` runs on push, pull request, and manual dispatch.
Actions are pinned to verified commit SHAs, permissions are read-only, overlapping
runs are cancelled, and jobs have a 20-minute timeout. Java/frontend workflows
upload test reports even on failure. All four workflows passed actionlint 1.7.7.
GitHub-hosted execution has not been verified. Local test execution was completed
on 2026-10-31; commit metadata dates do not represent additional test runs.

## Remaining gaps and boundaries

- Generation/content/calendar/credentials pages, OAuth redirects, real backend interaction, and browser end-to-end flows need coverage.
- jsdom form tests do not establish behavior on every browser/device. No production frontend build or browser acceptance session was run in this task.
- No code-coverage percentage or performance improvement is claimed.
