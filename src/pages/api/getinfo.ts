import { Agent } from "https";
import fetch from "node-fetch";

export default async (req, res) => {
  try {
    const url = `${process.env.LND_HOST}/v1/getinfo`;
    const data = await fetch(url, {
      method: "GET",
      headers: {
        "Grpc-Metadata-macaroon": process.env.MACAROON!,
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
