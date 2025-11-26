import type { NextRequest } from "next/server";
import { readLnurl } from "@/lib/lightning";

export const GET = async (req: NextRequest) => {
  // Check lnrul
  const lnurl = req.nextUrl.searchParams.get("lnurl");
  if (!lnurl) {
    return new Response("Missing lnurl", { status: 400 });
  }
  const data = await readLnurl(lnurl);
  return Response.json(data);
  // make payment
  // } else if (req.method === 'POST') {
  // const data = await payLnurl() as {status: string, error?: string};
  // if (data.status === 'failed') {
  //   res.status(400).json(data);
  //   return;
  // }
  // res.status(200).json(data)
};
