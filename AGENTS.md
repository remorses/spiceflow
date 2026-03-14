
# package manager: pnpm with workspace

This project uses pnpm workspaces to manage dependencies. Important scripts are in the root package.json or various packages package.json

try to run commands inside the package folder that you are working on. for example you should never run `pnpm test` from the root


# typescript

Try to use object arguments for new typescript functions if the function would accept more than one argument, this way you can use the object as a sort of named argument feature, where order of arguments does not matter and it's easier to discover parameters.

Always run `pnpm tsc --noEmit` from the package you changed after code edits, and fix any reported issues before finishing.

do not add useless comments if the code is self descriptive. only add comments if requested or if this was a change that i asked for, meaning it is not obvious code and needs some inline documentation.

try to use early returns and breaks, try nesting code as little as possible, follow the go best practice of if statements: avoid else, nest as little as possible, use top level ifs. minimize nesting.


# testing

Use vitest to run tests. Tests should be run from the current package directory and not root, try using the test script instead of vitest directly. Additional vitest flags can be added at the end, like --run to disable watch mode or -u to update snapshots.

Most tests should be simple calls to functions with some expect calls, no mocks. Test files should be called same as the file where the tested function is being exported from.

Tests should strive to be as simple as possible, the best test is a simple `.toMatchInlineSnapshot()` call. These can be easily evaluated reading the test file after the run passing the -u option. You can clearly see from the inline snapshot if the function behaves as expected or not.

Try to use only describe and test in your tests. Do not use beforeAll, before, etc if not strictly required.

Sometimes tests work directly on database data, using prisma. To run these tests you have to use the package.json script, which will call `doppler run -- vitest` or similar. Never run doppler cli yourself as you could delete or update production data. Tests generally use a staging database instead.

Never write tests yourself that call prisma or interact with database or emails. For these asks the user to write them for you.


# e2e testing (example-react)

E2e tests live in `example-react/e2e/` and use Playwright (chromium only). The dev server starts automatically via the `webServer` config in `playwright.config.ts`.

## running e2e tests

These are the integration test commands for the RSC app in `example-react/`:

- `pnpm test-e2e` runs the Playwright suite against the dev server, so it covers dev-only behavior like HMR and middleware behavior during development.
- `pnpm test-e2e-preview` runs the same Playwright suite against the production preview build, so it catches build-only regressions that do not show up in dev.
- Run both commands when validating an integration change, because they exercise different environments and one passing does not imply the other passes.

```bash
# run from example-react directory, never from root
cd example-react

# run all e2e tests
pnpm test-e2e

# filter by test name
pnpm test-e2e --grep "SSR error"

# run against production build
pnpm test-e2e-preview
```

Tests tagged `@dev` are skipped during preview runs; tests tagged `@build` are skipped during dev runs (controlled by `grepInvert` in playwright.config.ts).

## rebuild dist before testing

The Vite SSR middleware imports from `spiceflow/dist/` (the compiled package), NOT from source. If you modify files in `spiceflow/src/`, you must rebuild before e2e tests will pick up the changes:

```bash
cd spiceflow
pnpm tsc --noCheck   # --noCheck skips pre-existing type errors
```

This is the most common reason e2e tests fail after code changes — stale dist files.

## writing e2e tests

- The base URL and port are defined at the top of `basic.test.ts`:
  ```ts
  const port = Number(process.env.E2E_PORT || 6174);
  const baseURL = `http://localhost:${port}`;
  ```
- Use `page.goto("/path")` for browser-based tests that need rendering, JS execution, or DOM interaction.
- Use Node.js `fetch(baseURL + "/path")` directly (not `page.evaluate`) when you need to control HTTP headers like `Origin` — browsers restrict forbidden headers.
- Use `page.getByTestId()`, `page.getByText()`, `page.getByRole()` for locators. Prefer test-ids for stability.
- When a `data-testid` matches multiple elements (e.g. multiple counter components on a page), use `.filter({ hasText: "..." })` to disambiguate:
  ```ts
  const clientCounter = page.getByTestId("client-counter").filter({ hasText: "Client counter" });
  await clientCounter.getByRole("button", { name: "+" }).click();
  ```
- If a locator's text changes during the test (e.g. HMR edits), do NOT use it through a pre-filtered variable — query the page directly for the new text.

## adding test routes

To add a route for e2e testing, add it in `example-react/src/main.tsx` using the spiceflow API:

```ts
.page("/my-test-route", async () => {
    return <MyComponent />;
})
```

Client components used in tests should be created in `example-react/src/app/` with a `"use client"` directive.

## HMR tests

- `createEditor("src/app/file.tsx")` from `e2e/helper.ts` edits a file and auto-reverts on dispose.
- Always call `file[Symbol.dispose]()` or use `try/finally` to restore files after edits.
- When editing files, make sure the `replace()` string actually exists in the source. For example, `client.tsx` has `name = "Client"` as a default prop — the literal string "Client counter" does NOT exist in the file, so `replace("Client counter", ...)` would be a no-op and the HMR test would silently fail.
- **Client HMR preserves state**: editing a client component triggers React Fast Refresh without a server re-render. Client state is preserved. Vite's SSR environment logs `page reload` internally but the browser does not actually reload — Fast Refresh handles it.
- **Server HMR preserves server state**: editing a server component triggers RSC HMR. Server-side state (e.g. counters stored in module scope) is preserved. Client state is also preserved because no full page reload occurs.
- The home page has a `serverRenderCount` counter (`data-testid="server-render-count"`) that increments on each RSC render. Use it in tests to verify whether a server re-render happened.


# website

the website uses react-router v7.

React-router framework is the successor of Remix, it is basically the same framework and it uses loaders and actions as core features.

react-router follows all the conventions of remix but all imports must be updated to point to `react-router` instead of `@remix-run/react` or `@remix-run/node`.

## route file exports

You can export the functions `loader` and `action` to handle loading data and submitting user data.

The default export (not always required for API routes) is the jsx component that renders the page visually.

Notice that the `json` utils was removed from `react-router`, instead there is a function `data` which is very similar and accepts a second argument to add headers and status like `json` does, but it supports more data types than json, like generators, async generators, dates, map, sets, etc.

## type safety

react-router exports a `Route` namespace with types like `Route.LoaderArgs`, `Route.ActionArgs` and `Route.ComponentProps`

these types can be used for the main route exports, they must be imported from `./+types/{route-basename}`

For example if the current file is `src/routes/home.tsx` you can import `import { Route } from './+types/home'`.

## styling

always use tailwind for styling, prefer using simple styles using flex and gap. Try to use the built in tailwind colors like gray, red, green, etc. Margins should be avoided, instead use flexbox gaps, grid gaps, or separate spacing divs.

## files

always use kebab case for new filenames. never use uppercase letters in filenames

## changesets

after you make a change that is noteworthy, add a changeset manually as a markdown file inside the `.changeset` folder. these files are used later on to create the changelog for the package. if the current cwd does not have a `.changeset` folder, check parent directories.

NEVER make breaking changes changesets. our releases are close enough in time that you should never do breaking changes, even if we do one you have nothing to worry about because it's probably a publish so close in time that on one will ever use the current version.

Only add changesets for packages that are not marked as `private` in their `package.json` and have a `version` in the package.json.

Changeset files should be plain `.md` files with this structure:

```md
---
'package-name': patch # can also be `minor`, never use `major`
---

markdown describing the changes you made, in present tense, like "add support for X" or "fix bug with Y". write a single concise paragraph, not bullet points or lists. include example code snippets if useful, and use proper markdown formatting.

```
