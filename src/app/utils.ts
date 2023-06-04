import { fromSats } from 'satcomma';
import { Event as NostrEvent, finishEvent, nip57, validateEvent, verifySignature } from 'nostr-tools';
import { decode as invoiceDecode } from 'light-bolt11-decoder'

export const validateLnurl = async (lnurl: string) => {
  const url = `/api/validate?lnurl=${encodeURIComponent(lnurl)}`;
  const res = await fetch(url, { method: 'GET', });
  const data = await res.json();
  if (res.status === 200 && data.status === 'OK') {
    return { valid: true, domain: data.domain };
  } else {
    return { valid: false };
  }
}

export const handleStatusUpdate = (status, lnAddress, userAddress, jackpot, timestamp, va, toast) => {
  if (status === 'LIVE' && lnAddress !== userAddress) {
      va.track('Bid', { user: lnAddress, jackpot, timestamp });
      toast(`Bid Received! - ${lnAddress}`, { type: 'info' });
    } else if (status === 'EXPIRED' && lnAddress !== userAddress) {
      toast(`Timer Expired! ${lnAddress} wins ₿ ${fromSats(jackpot)}!`, { type: 'info', pauseOnFocusLoss: true });
    } else if (status === 'WINNER') {
      va.track('Winner', { user: lnAddress, jackpot, timestamp });
      toast(`CONGRATULATIONS! You've won ₿ ${fromSats(jackpot)}!`, { type: 'success', pauseOnFocusLoss: true });
    } else if (status === 'PAYMENT_SUCCESS') {
      va.track('Winner Payment Success', { user: lnAddress, jackpot, timestamp });
      toast(`Payment Settled! Enjoy your Sats!`, { type: 'success', pauseOnFocusLoss: true });
    } else if (status === 'PAYMENT_FAILED') {
      va.track('Winner Payment Failed', { user: lnAddress, jackpot, timestamp });
      toast(`Payment Failed - DM @_alexlewin on Twitter to get paid.`, { type: 'error', pauseOnFocusLoss: true });
    }
};

export const checkInvoiceStatus = (setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey, newNote: NostrEvent | null, status) => {
  setChecking(true);
  console.log('newNote', newNote, 'status', status)
  let nostr: string | null = null
  if (newNote && status !== "LIVE") {
    // tell server to post this specific "Round Started" kind 1
    console.log("SHOULD PUBLISH KIND 1 newNote", newNote)
    nostr = encodeURI(JSON.stringify(newNote))
  }
  const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}&nostr=${nostr}`
  console.log('url', url)
  fetch(url, { method: 'GET' })
    .then((response) => response.json())
    .then((data) => {
      if (data.settled) {

        setSettled(data.settled && true);
        localStorage.setItem('lnaddr', userAddress);
        setCountdownKey(prevKey => prevKey + 1);
        setHash(null);
        toast("Bid Received! You're in the lead!", { type: 'success' });
      }
      setChecking(false);
    }).catch(_ => setChecking(false));
}

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
    // TODO: Profile will be LPW nostr pubkey
    profile: "44965ed7ec11633bc9aa05ec70c16535667c1a7b3559d0a3af8ab6ad0524a9ef", // test lpw account
    // TODO: set to round specific LPW kind 1 announcement
    // event: "51cc2a2d9f4b548da6ebf34e45be8a6ed54e999a464143674f5f3910c2c45cc8", // test lpw kind 1
    event: eventId, // test lpw kind 1
    amount: amountMillisats,
    comment: 'Bid on lastpaywins.com',
    // NOTE: lnbits lnurlp 0.3 will break if it tries to publish to non public relays I think
    relays: ["wss://relay.damus.io"]
  }
  console.debug('zapRequestArgs', zapRequestArgs)

  try {
    const signedZapRequestEvent = finishEvent(nip57.makeZapRequest(zapRequestArgs), privateKey)
    console.debug('signedZapRequestEvent', signedZapRequestEvent)

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

export interface InvoiceDetails {
  amount?: number
  expire?: number
  timestamp?: number
  description?: string
  descriptionHash?: string
  paymentHash?: string
  expired: boolean
}

const decodeInvoice = (pr: string): InvoiceDetails | undefined => {
  try {
    const parsed = invoiceDecode(pr)

    const amountSection = parsed.sections.find((a) => a.name === 'amount')
    const amount = amountSection ? Number(amountSection.value as number | string) : undefined
    const timestampSection = parsed.sections.find((a) => a.name === 'timestamp')
    const timestamp = timestampSection ? Number(timestampSection.value as number | string) : undefined
    const expirySection = parsed.sections.find((a) => a.name === 'expiry')
    const expire = expirySection ? Number(expirySection.value as number | string) : undefined
    const descriptionSection = parsed.sections.find((a) => a.name === 'description')?.value
    const descriptionHashSection = parsed.sections.find((a) => a.name === 'description_hash')?.value
    const paymentHashSection = parsed.sections.find((a) => a.name === 'payment_hash')?.value

    const ret = {
      amount: amount,
      expire: timestamp && expire ? timestamp + expire : undefined,
      timestamp: timestamp,
      description: descriptionSection as string | undefined,
      descriptionHash: descriptionHashSection as string | undefined,
      paymentHash: paymentHashSection as string | undefined,
      expired: false,
    }
    if (ret.expire) {
      ret.expired = ret.expire < new Date().getTime() / 1000
    }
    return ret
  } catch (e) {
    console.error(e)
  }
}