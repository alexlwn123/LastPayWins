import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up stale presence records every 5 minutes
crons.interval(
  "cleanup stale presence",
  { minutes: 5 },
  internal.presence.cleanupStale
);

export default crons;
