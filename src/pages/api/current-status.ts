import pusher, { getLastPayer } from "../../lib/pusher";
export default async (req, res) => {
  try {
    if (req.method === "GET") {
      const lastPayer = await getLastPayer();
      if (!lastPayer?.lnAddress) {
        lastPayer.lnAddress = "No one has paid yet";
        lastPayer.timestamp = Date.now();
      }
      res.status(200).json(lastPayer);
    } else {
      res.status(405).json({ error: "Method not supported" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  }
};
