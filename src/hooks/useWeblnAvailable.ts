import { useEffect, useState } from "react";

declare global {
  interface Window {
    webln: any
  }
}
export const handleWeblnPay = async (setWebln, toast, invoice) => {
    setWebln(true);
    try {
      await window.webln.enable();
    } catch(e) {
      console.error('Failed to enable webln')
      toast("Failed to enable webln", { type: 'error' });
      setWebln(false);
      return;
    }

    try {
      await window.webln.sendPayment(invoice)
    } catch(e) {
      console.error('WebLn Canceled', e)
      toast("WebLn Canceled", { type: 'error' });
    }
    setWebln(false);

};

export const useWeblnAvailable = () => {
  const [ weblnAvailable, setWebLNAvailable] = useState<boolean>(false)
  const [webLn, setWebln] = useState(false);

  useEffect(() => {
    if (window.webln) {
      setWebLNAvailable(true)
    }
  }, [])

  return {weblnAvailable, webLn, setWebln}
};