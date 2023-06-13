import { useEffect, useState } from 'react'
import { generatePrivateKey, Event as NostrEvent } from 'nostr-tools'
import { getNewNostrPost, getZapEndpoint, getZapInvoice } from '@/app/utils/nostr'
import { MatchState } from '@/types/matchStates'

export const useZaps = (lightningAddress: string | null, matchState: MatchState, eventId: string)  => {
  const [nostrPrivKey, setNostrPrivKey] = useState<string | null>(null)
  const [nostrZapCallback, setNostrZapCallback] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false);
  const [newNote, setNewNote] = useState<NostrEvent | null>(null)
  const [invoice, setInvoice] = useState<string | null | undefined>(null);
  const [hash, setHash] = useState<string | null | undefined>(null);
  const [settled, setSettled] = useState(false);
  const [refetch, setRefetch] = useState(false)

  useEffect(() => {
    // get nostr hex private key from storage or generate one
    let privKey = localStorage.getItem('privKey');
    if (privKey) {
      setNostrPrivKey(privKey)
    } else {
      privKey = generatePrivateKey()
      setNostrPrivKey(privKey)
      localStorage.setItem('privKey', privKey)
    }
  }, [])

  // Get invoice
  useEffect(() => {
    console.debug('MATCH STATE', matchState)
    if (!nostrPrivKey || !nostrZapCallback || fetching || matchState === "LOADING") return;

    const fetchInvoice = async () => {
      setFetching(true)

      if (matchState === "WAITING") {
        const event = await getNewNostrPost()
        if (!event) return
        setNewNote(event)

        const zap = await getZapInvoice(nostrPrivKey, nostrZapCallback, event.id)
        setInvoice(zap?.invoice)
        setHash(zap?.paymentHash)
        setSettled(false);
        setFetching(false);
        return
      }

      const zap = await getZapInvoice(nostrPrivKey, nostrZapCallback, eventId)
      setInvoice(zap?.invoice)
      setHash(zap?.paymentHash)
      setSettled(false);
      setFetching(false);
    }

    fetchInvoice()
  }, [refetch, nostrPrivKey, nostrZapCallback, matchState]);

  useEffect(() => {
    getZapEndpoint(lightningAddress)
      .then((data) => {
        if (data) {
          if (process.env.NEXT_PUBLIC_INVOICE_AMOUNT  && parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT)*1000 > data.maxSendable) {
            console.warn('Desired invoice amount larger than lnurl maxSendable')
            return 
          }
          if (process.env.NEXT_PUBLIC_INVOICE_AMOUNT  && parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT)*1000 < data.minSendable) {
            console.warn('Desired invoice amount lower than lnurl minSendable')
            return 
          }
          setNostrZapCallback(data.callback)
        }
        else console.warn("No zap enabled lightning address found")
      })
  }, [])

  return { hash, setHash, settled, setSettled, fetching, setRefetch, newNote, invoice}
}

export default useZaps