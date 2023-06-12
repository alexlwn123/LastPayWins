import { Event as NostrEvent, finishEvent, nip57, validateEvent, verifySignature } from 'nostr-tools';
import { decodeInvoice } from './invoice'

export async function getNewNostrPost(): Promise<{event: NostrEvent}> {
  const url = '/api/nostr'
  const res = await fetch(url, { method: 'POST' })
  let data = await res.json()
  console.debug('client getNewNostrPost data', data)
  return {event: data}
}

export async function getZapEndpoint(
  lud16: string | null,
): Promise<null | { callback: string; minSendable: number; maxSendable: number; nostrPubkey: string; lnurl: string }> {
  try {
    let lnurl: string = ''
    if (lud16) {
      let [name, domain] = lud16.split('@')
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`
    } else {
      return null
    }

    let res = await fetch(lnurl)
    let body = await res.json()

    if (body.allowsNostr && body.nostrPubkey) {
      return {
        callback: body.callback,
        minSendable: body.minSendable,
        maxSendable: body.maxSendable,
        nostrPubkey: body.nostrPubkey,
        lnurl: lnurl,
      }
    }
  } catch (err) {
    /*-*/
  }

  return null
}

export const getZapInvoice = async (privateKey: string, nostrZapCallback: string, eventId: string): Promise<{invoice: string, paymentHash: string} | undefined> => {
  const amountMillisats = parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT || "1000") * 1000

  const zapRequestArgs = {
    profile: process.env.NEXT_PUBLIC_NOSTR_HEX_PUBLIC_KEY!,
    event: eventId,
    amount: amountMillisats,
    comment: 'Bid on lastpaywins.com',
    // NOTE: lnbits lnurlp 0.3 will break if it tries to publish to non public relays I think
    relays: ["wss://relay.damus.io"]
  }
  console.debug('zapRequestArgs', zapRequestArgs)

  try {
    const signedZapRequestEvent = finishEvent(nip57.makeZapRequest(zapRequestArgs), privateKey)
    let ok = validateEvent(signedZapRequestEvent)
    if (!ok) throw new Error('Invalid event')
    let veryOk = verifySignature(signedZapRequestEvent)
    if (!veryOk) throw new Error('Invalid signature')

    const encodedZapRequest = encodeURI(JSON.stringify(signedZapRequestEvent))
    const zapRequestHttp = `${nostrZapCallback}?amount=${amountMillisats.toString()}&nostr=${encodedZapRequest}&lnurl=${process.env.NEXT_PUBLIC_NOSTR_LIGHTNING_ADDRESS}`

    const resObj = await fetch(zapRequestHttp).then((res) => res.json())
    if (resObj.status === 'ERROR') throw new Error(resObj.reason)

    const { pr: invoice } = resObj
    const decodedInvoice = decodeInvoice(invoice)
    if (!decodedInvoice?.paymentHash) throw new Error('Missing payment hash')

    return { invoice, paymentHash: decodedInvoice.paymentHash } 
  } catch(e) {
    console.error(e)
  }
}