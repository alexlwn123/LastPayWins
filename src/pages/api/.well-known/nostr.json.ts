import type { NextApiRequest, NextApiResponse } from 'next'

const verifiedDB = {
  lpw: {
    pubkey: "ff60b0f48e0eded3ee3acc15b1b84bd323e367f87762481be1fa08622a52d666",
    relays: ["wss://relay.damus.io", "wss://relay.terminus.money"]
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let nip05 = {
    names: {},
    relays: {}
  }

  if (typeof req.query.name == "string") {
    const pubkey = verifiedDB[req.query.name]?.pubkey 
    if (!pubkey) return res.status(200).json(nip05)

    nip05.names[req.query.name] = pubkey

    const relays = verifiedDB[req.query.name].relays
    if (relays.length > 0) {
      nip05.relays[pubkey] = verifiedDB[req.query.name].relays
    }
  }

  res.status(200).json(nip05)
}