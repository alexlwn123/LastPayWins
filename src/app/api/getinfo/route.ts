import { Agent } from "node:https";
import fetch from "node-fetch";
import { LND_HOST, MACAROON } from "@/lib/serverEnvs";

export const GET = async () => {
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
    return Response.json(await data.json());
  } catch (e) {
    console.error(e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
