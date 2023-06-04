import { UnsignedEvent, getEventHash, getPublicKey, getSignature, validateEvent, verifySignature } from "nostr-tools";

export const createEvent = () => {
  let event: UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: "A new round has started!\nVisit lastpaywins.com to play! :shaka:",
    pubkey: getPublicKey(process.env.NOSTR_HEX_PRIVATE_KEY!)
  };
  let unsignedEvent = {
    ...event,
    id: getEventHash(event)
  }

  const signedEvent = {
    ...unsignedEvent,
    sig: getSignature(unsignedEvent, process.env.NOSTR_HEX_PRIVATE_KEY!)
  }
  // console.log("event", signedEvent);

  try {
    let ok = validateEvent(signedEvent)
    if (!ok) throw new Error('Invalid event')

    let veryOk = verifySignature(signedEvent)
    if (!veryOk) throw new Error('Invalid signature')
    return signedEvent
  } catch(e) {
    console.error(e)
  }
}