/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as invoiceActions from "../invoiceActions.js";
import type * as invoices from "../invoices.js";
import type * as paymentBridge from "../paymentBridge.js";
import type * as paymentEvents from "../paymentEvents.js";
import type * as paymentRules from "../paymentRules.js";
import type * as payoutActions from "../payoutActions.js";
import type * as payouts from "../payouts.js";
import type * as presence from "../presence.js";
import type * as telegram from "../telegram.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  crons: typeof crons;
  games: typeof games;
  http: typeof http;
  invoiceActions: typeof invoiceActions;
  invoices: typeof invoices;
  paymentBridge: typeof paymentBridge;
  paymentEvents: typeof paymentEvents;
  paymentRules: typeof paymentRules;
  payoutActions: typeof payoutActions;
  payouts: typeof payouts;
  presence: typeof presence;
  telegram: typeof telegram;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
