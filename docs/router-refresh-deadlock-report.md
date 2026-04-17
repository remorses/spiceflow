---
title: Router refresh deadlock report
description: Why awaiting a refresh commit inside a React client form action can deadlock, and what API change should prevent it.
---

# Router refresh deadlock report

## Summary

Yes. `router.refresh()` has the same deadlock shape if code awaits the refresh commit from inside a React client form action.

The problem is not specific to server actions. It comes from React's client form action flow:

- React starts a host transition for `<form action={clientAction}>`
- React keeps that transition pending until `clientAction(...)` settles
- a refresh commit only finishes after the transition can commit
- if the client action awaits that refresh commit, both sides wait on each other forever

## Current Spiceflow behavior

Relevant files:

- `spiceflow/src/react/router.tsx`
- `spiceflow/src/react/entry.client.tsx`
- `integration-tests/src/app/client.tsx`
- `integration-tests/e2e/basic.test.ts`

`router.refresh()` now stays fire-and-forget. It asks the history layer to emit a same-location navigation and refresh the RSC payload, but it does not expose a commit promise from the public router API.

That is the safe default for React client form actions, because React itself is already waiting for that action to finish before it lets the transition commit.

## Deadlock cycle

1. User submits `<form action={clientAction}>`
2. React calls `startHostTransition(..., clientAction, formData)`
3. `clientAction` calls an awaitable refresh helper
4. Spiceflow waits for the refreshed payload to commit before resolving it
5. React cannot commit the transition until `clientAction` returns
6. `clientAction` never returns because it is waiting for the commit

Result: the form stays pending and the page never updates.

## API rule

The public API should keep the safe rule simple:

- `router.refresh()` returns `void`
- `router.push()`, `router.replace()`, `router.back()`, `router.forward()`, and `router.go()` stay fire-and-forget too
- do not expose an implicit "wait for commit" promise from navigation helpers

## Repro shape to add

The best regression repro is a client component in `integration-tests` with:

- a `<form action={clientAction}>`
- `clientAction` triggering `router.refresh()`
- an explicit await for refresh completion
- a Playwright assertion that the submit hangs and times out

This should live beside the existing router refresh integration route and e2e coverage.

## Fix direction

The fix should make the safe thing the default API:

1. Keep `router.refresh()` fire-and-forget
2. Keep navigation helpers fire-and-forget too
3. Add a separate explicitly named awaitable helper only if really needed
4. Document that awaitable navigation/refresh completion must not be used inside React client form actions

## Recommended API direction

Preferred split:

- `router.refresh()` — request a refresh, return `void`
- `router.push()` / `router.replace()` / `router.back()` / `router.forward()` / `router.go()` — schedule navigation, return `void`
- `router.whenNextRefreshCommits()` or similarly explicit helper — await commit outside form actions only

That makes the dangerous pattern much harder to write by accident and keeps the normal mutation flow simple.

## Why not silently resolve early?

Changing the refresh promise to resolve before commit would avoid the deadlock but would also make the API lie. Callers would think refreshed loader data is available when it is not.

So the better fix is an API split, not a fake early resolution.
