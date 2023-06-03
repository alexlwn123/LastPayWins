import { useEffect, useState } from 'react'
import { generatePrivateKey } from 'nostr-tools'
import { getZapEndpoint } from '@/app/utils'

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
      // setNostrPrivKey(privKey)
      localStorage.setItem('privKey', privKey)
    }
  }, [])

  useEffect(() => {
    getZapEndpoint(lightningAddress)
      .then((data) => {
        if (data) {
          console.debug(data)
          // TODO: Check min/max sendable against invoice amount env
          // if (process.env.NEXT_PUBLIC_INVOICE_AMOUNT > data.maxSendable)
          setNostrZapCallback(data.callback)
        }
        else console.debug("No zap enabled lightning address found")
        setZapChecked(true)
      })
  }, [])

  return { zapChecked, nostrPrivKey, nostrZapCallback }
}

export default useZaps