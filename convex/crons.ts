import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "cleanup stale presence",
  { minutes: 5 },
  internal.presence.cleanupStale,
  {},
);
crons.interval(
  "reconcile invoices",
  { seconds: 5 },
  internal.invoices.reconcile,
  {},
);
crons.interval(
  "reconcile payment events",
  { seconds: 5 },
  internal.paymentEvents.reconcile,
  {},
);
crons.interval(
  "reconcile payouts",
  { seconds: 30 },
  internal.payouts.reconcile,
  {},
);
export default crons;
