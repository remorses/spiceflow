
# package manager: pnpm with workspace

This project uses pnpm workspaces to manage dependencies. Important scripts are in the root package.json or various packages package.json

try to run commands inside the package folder that you are working on. for example you should never run `pnpm test` from the root

# typescript

Try to use object arguments for new typescript functions if the function would accept more than one argument, this way you can use the object as a sort of named argument feature, where order of arguments does not matter and it's easier to discover parameters.

do not add useless comments if the code is self descriptive. only add comments if requested or if this was a change that i asked for, meaning it is not obvious code and needs some inline documentation.

try to use early returns and breaks, try nesting code as little as possible, follow the go best practice of if statements: avoid else, nest as little as possible, use top level ifs. minimize nesting.


# testing

Use vitest to run tests. Tests should be run from the current package directory and not root, try using the test script instead of vitest directly. Additional vitest flags can be added at the end, like --run to disable watch mode or -u to update snapshots.

Most tests should be simple calls to functions with some expect calls, no mocks. Test files should be called same as the file where the tested function is being exported from.

Tests should strive to be as simple as possible, the best test is a simple `.toMatchInlineSnapshot()` call. These can be easily evaluated reading the test file after the run passing the -u option. You can clearly see from the inline snapshot if the function behaves as expected or not.

Try to use only describe and test in your tests. Do not use beforeAll, before, etc if not strictly required.

Sometimes tests work directly on database data, using prisma. To run these tests you have to use the package.json script, which will call `doppler run -- vitest` or similar. Never run doppler cli yourself as you could delete or update production data. Tests generally use a staging database instead.

Never write tests yourself that call prisma or interact with database or emails. For these asks the user to write them for you.


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

after you make a change that is noteworthy, add a changeset. these will be used later on to create a changelog for the package. use `pnpm changeset add --empty` to create a changeset file in `.changeset` folder, then write there the changes you made in a single concise paragraph. never run other changeset commands, like `pnpm changeset version` or `pnpm changeset publish`. Notice that sometimes the cwd is missing `.changeset` folder, in that case check the parents directories.

Only add changesets for packages that are not marked as `private` in their `package.json` and have a `version` in the package.json.

Changeset files are structured like this:

```md
---
'package-name': patch # can also be `minor` or `major`, never use major
---

markdown describing the changes you made, in present tense, like "add support for X" or "fix bug with Y". Be detailed but concise, and never use bullet points or lists. Always show example code snippets if applicable, and use proper markdown formatting.

```
