import { useEffect, useState } from 'react'
import { generatePrivateKey } from 'nostr-tools'
import { getZapEndpoint } from '@/app/utils/nostr'

export const useZaps = (lightningAddress: string | null)  => {
  const [zapChecked, setZapChecked] = useState(false)
  const [nostrPrivKey, setNostrPrivKey] = useState<string | null>(null)
  const [nostrZapCallback, setNostrZapCallback] = useState<string | null>(null)

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

  useEffect(() => {
    getZapEndpoint(lightningAddress)
      .then((data) => {
        if (data) {
          if (process.env.NEXT_PUBLIC_INVOICE_AMOUNT  && parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT)*1000 > data.maxSendable) {
            console.warn('Desired invoice amount larger than lnurl maxSendable')
            setZapChecked(true)
            return 
          }
          if (process.env.NEXT_PUBLIC_INVOICE_AMOUNT  && parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT)*1000 < data.minSendable) {
            console.warn('Desired invoice amount lower than lnurl minSendable')
            setZapChecked(true)
            return 
          }
          setNostrZapCallback(data.callback)
        }
        else console.warn("No zap enabled lightning address found")
        setZapChecked(true)
      })
  }, [])

  return { zapChecked, nostrPrivKey, nostrZapCallback }
}

export default useZaps