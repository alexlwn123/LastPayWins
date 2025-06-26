import { Agent } from "node:https";
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { LND_HOST, MACAROON } from "@/lib/serverEnvs";

export default async (_req: NextApiRequest, res: NextApiResponse) => {
  try {
    const url = `${LND_HOST}/v1/getinfo`;
    const data = await fetch(url, {
      method: "GET",
      headers: {
        "Grpc-Metadata-macaroon": MACAROON,
        "Content-Type": "application/json",
      },
      agent: new Agent({
        rejectUnauthorized: false,
      }),
    });
    res.status(200).json(await data.json());
  } catch (e) {
    console.log(e);
    res.status(500).json(e);
  }
};
