import { fromSats } from 'satcomma';
import { Event, UnsignedEvent, getEventHash, getPublicKey, getSignature, nip57, validateEvent, verifySignature } from 'nostr-tools';
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

export const checkInvoiceStatus = (setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey) => {
  setChecking(true);
  const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}`
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

export const getZapInvoice = async (privateKey: string): Promise<{invoice: string, paymentHash: string} | undefined> => {
  const zapRequestArgs = {
    profile: process.env.NEXT_PUBLIC_NOSTR_ZAP_HEX_PUBLIC_KEY!,
    // TODO: set to round specific LPW kind 1 announcement
    event: null,
    amount: 10000,
    comment: '',
    relays: ['wss://brb.io','wss://relay.damus.io','wss://nostr.fmt.wiz.biz','wss://nostr.oxtr.dev','wss://arc1.arcadelabs.co','wss://relay.nostr.ch','wss://eden.nostr.land','wss://nos.lol','wss://relay.snort.social','wss://relay.current.fyi']
  }

  try {
    const zapRequestEvent: UnsignedEvent = {
      ...nip57.makeZapRequest(zapRequestArgs),
      pubkey: getPublicKey(privateKey)
    }

    const signedZapRequestEvent: Event = {
      ...zapRequestEvent,
      id: getEventHash(zapRequestEvent),
      sig: getSignature(zapRequestEvent, privateKey)
    }

    let ok = validateEvent(signedZapRequestEvent)
    if (!ok) throw new Error('Invalid event')

    console.debug('signedZapRequestEvent', signedZapRequestEvent)
    let veryOk = verifySignature(signedZapRequestEvent)
    if (!veryOk) throw new Error('Invalid signature')

    const encodedZapRequest = encodeURI(JSON.stringify(signedZapRequestEvent))
    const zapRequestHttp = `${process.env.NEXT_PUBLIC_NOSTR_ZAP_CALLBACK!}?amount=10000&nostr=${encodedZapRequest}&lnurl=${process.env.NEXT_PUBLIC_NOSTR_LIGHTNING_ADDRESS!}`
    console.debug('zapRequestHttp', zapRequestHttp)

    const resObj = await fetch(zapRequestHttp).then((res) => res.json())
    console.debug('resObj', resObj)
    if (resObj.status === 'ERROR') throw new Error(resObj.reason)

    const { pr: invoice } = resObj
    console.log('Success! Invoice: ', invoice)
    const decodedInvoice = decodeInvoice(invoice)
    if (!decodedInvoice?.paymentHash) throw new Error('Missing payment hash')
    console.debug('decodedInvoice', decodedInvoice)

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