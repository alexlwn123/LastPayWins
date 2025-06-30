# Refactoring TODOs

This document outlines a list of refactoring tasks to improve the codebase's structure, maintainability, and prepare it for future feature development. Each task is designed to be completed in isolation.

## High-Impact Refactors

### 1. Consolidate Lightning Network Logic

**Goal:** Abstract the Lightning Network interactions into a unified service to simplify API routes and make it easier to manage different backend implementations (LND, LNbits).

- [x] **Create a Lightning Service module:**

  - Create a new file: `src/lib/lightning.ts`.
  - This file will export a `lightningService` object.

- [x] **Define a unified interface:**

  - In `src/lib/lightning.ts`, define a standard interface for Lightning operations, such as `createInvoice`, `checkInvoice`, and `payInvoice`.

- [x] **Implement the LNbits service:**

  - Move the functions from `src/lib/lnbits.ts` into the new `src/lib/lightning.ts` file.
  - Adapt the functions to the unified interface.

- [x] **Implement the LND service:**

  - Move the LND-related logic from `src/pages/api/invoice.ts` into `src/lib/lightning.ts`.
  - Adapt the functions to the unified interface.

- [x] **Add a configuration switch:**

  - Use an environment variable (e.g., `LIGHTNING_BACKEND`) to determine whether to use the "lnd" or "lnbits" implementation in the `lightningService`.

- [x] **Refactor API routes to use the new service:**
  - Update `src/pages/api/invoice.ts` and `src/pages/api/payments.ts` to import and use the `lightningService` instead of the direct LND/LNbits calls.

### 2. Centralize State Management

**Goal:** Introduce a state management library (e.g., Zustand) to create a single source of truth for the application's state, simplifying state management and improving data flow.

- [ ] **Install Zustand:**

  - Run `npm install zustand`.

- [ ] **Create a store:**

  - Create a new file: `src/store/index.ts`.
  - Define a Zustand store that includes the application's state, such as `lastPayer`, `jackpot`, `status`, etc.

- [ ] **Refactor `usePusher` to update the store:**

  - Modify the `usePusher` hook (`src/hooks/usePusher.ts`) to call the Zustand store's actions to update the state instead of using its own `useState`.

- [ ] **Refactor components to use the store:**
  - Update components like `Countdown.tsx`, `CurrentWinner.tsx`, and `Jackpot.tsx` to get their state from the Zustand store instead of props.

### 3. Refactor the `Countdown` Component

**Goal:** Simplify the `Countdown` component by moving business logic into hooks and the central state management store.

- [ ] **Move page visibility to a dedicated hook:**

  - The logic in `src/hooks/usePageVisibility.ts` is already well-contained. Ensure it's used correctly in the `Countdown` component.

- [ ] **Move time calculation to the store:**

  - The logic for calculating the `initialTimeRemaining` in `src/components/Countdown.tsx` should be moved into the Zustand store. The component should receive the `timeRemaining` as a prop or directly from the store.

- [ ] **Simplify the component's props:**
  - After moving state management to Zustand, the `Countdown` component should require fewer props, making it a more presentational component.

## Medium-Impact Refactors

### 4. Environment Variable Management

**Goal:** Centralize environment variable access to improve maintainability and prevent runtime errors.

- [ ] **Create a config file:**

  - Create a new file: `src/config.ts`.
  - Export all environment variables from this file, providing default values where necessary.

- [ ] **Update the codebase to use the config file:**
  - Replace all instances of `process.env.VARIABLE_NAME` with imports from the new `src/config.ts` file.

### 5. API Route Consistency

**Goal:** Standardize API route handling to reduce boilerplate and improve error handling.

- [ ] **Create a request handler middleware:**

  - Create a higher-order function in a new file (e.g., `src/lib/api-helpers.ts`) that wraps the API route handlers.
  - This middleware should handle `try...catch` blocks, method checking (GET, POST, etc.), and consistent error responses.

- [ ] **Apply the middleware to API routes:**
  - Refactor the API routes in `src/pages/api/` to use the new middleware.

### 6. Refactor `usePusher` Hook

**Goal:** Decompose the `usePusher` hook into smaller, more focused hooks.

- [ ] **Create a `usePusherConnection` hook:**

  - Extract the Pusher connection and channel subscription logic from `src/hooks/usePusher.ts` into a new `usePusherConnection` hook.

- [ ] **Create a `useLastPayer` hook:**
  - Create a new hook that uses `usePusherConnection` and is responsible for subscribing to the "last payer" channel and managing that specific piece of state.

## Low-Impact Refactors

### 7. Component Prop Typing

**Goal:** Improve code readability and maintainability by defining explicit types for component props.

- [ ] **Define prop types for `Countdown`:**

  - In `src/components/Countdown.tsx`, create a `type` or `interface` for the component's props and apply it.

- [ ] **Define prop types for `CurrentWinner`:**
  - In `src/components/CurrentWinner.tsx`, create a `type` or `interface` for the component's props and apply it.

### 8. Consolidate Styles

**Goal:** Create a more consistent look and feel by consolidating common styles.

- [ ] **Identify common styles:**

  - Review the `.module.css` files in `src/components` and identify common styles (colors, fonts, spacing, etc.).

- [ ] **Create a global stylesheet:**

  - Move the common styles to `src/app/globals.css` and use CSS variables.

- [ ] **Update components to use global styles:**
  - Refactor the component-specific stylesheets to use the new global CSS variables.
