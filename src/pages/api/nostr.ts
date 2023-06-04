import { createEvent } from "@/lib/nostr";

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      const event = createEvent();
      console.debug('POST getNewNostrPost', event)
      res.status(200).json(event);
    } else if (req.method === 'GET') {
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }
}