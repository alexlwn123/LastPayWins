import type { NextRequest } from "next/server";
import { readLnurl } from "@/lib/lightning";

export const GET = async (req: NextRequest) => {
  const lnurl = req.nextUrl.searchParams.get("lnurl");
  if (!lnurl) {
    return new Response("Missing lnurl", { status: 400 });
  }
  const data = await readLnurl(lnurl);
  return Response.json(data);
};
