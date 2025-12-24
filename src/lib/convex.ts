"server only";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { CONVEX_URL } from "./serverEnvs";

const convexUrl = CONVEX_URL;

const convex = new ConvexHttpClient(convexUrl);

export const recordBid = async (lnAddress: string) => {
  return await convex.mutation(api.games.recordBid, { lnAddress });
};

export default convex;
