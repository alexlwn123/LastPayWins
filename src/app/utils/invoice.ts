import { Event as NostrEvent } from 'nostr-tools';
import { decode as invoiceDecode } from 'light-bolt11-decoder'
import { MatchStates } from '@/types/matchStates';

export const validateLnurl = async (lnurl: string) => {
  const url = `/api/validate?lnurl=${encodeURIComponent(lnurl)}`;
  const res = await fetch(url, { method: 'GET', });
  const data = await res.json();
  if (res.status === 200 && data.domain) {
    return { valid: true, domain: data.domain };
  } else {
    return { valid: false };
  }
}

export const checkInvoiceStatus = (setChecking, hash, setHash, setSettled, toast, userAddress, setCountdownKey, newNote: NostrEvent | null, matchState: MatchStates) => {
  setChecking(true);
  let nostr: string | null = null
  if (newNote && matchState.currentState === "WAITING") {
    // tell server to post this specific "Round Started" kind 1
    nostr = encodeURI(JSON.stringify(newNote))
  }
  const url = `/api/invoice?hash=${encodeURIComponent(hash!)}&lnaddr=${userAddress}&nostr=${nostr}`
  console.debug('url', url)
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

export interface InvoiceDetails {
  amount?: number
  expire?: number
  timestamp?: number
  description?: string
  descriptionHash?: string
  paymentHash?: string
  expired: boolean
}

export const decodeInvoice = (pr: string): InvoiceDetails | undefined => {
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