import { useEffect, useState } from "react";
import { toast } from "react-toastify";

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: TODO. add the type
    webln: any;
  }
}
export const handleWeblnPay = async (setWebln, invoice) => {
  setWebln(true);
  try {
    await window.webln.enable();
  } catch {
    console.error("Failed to enable webln");
    toast("Failed to enable webln", { type: "error" });
    setWebln(false);
    return;
  }

  try {
    await window.webln.sendPayment(invoice);
  } catch (e) {
    console.error("WebLn Canceled", e);
    toast("WebLn Canceled", { type: "error" });
  }
  setWebln(false);
};

export const useWeblnAvailable = () => {
  const [weblnAvailable, setWebLNAvailable] = useState<boolean>(false);
  const [webLn, setWebln] = useState(false);

  useEffect(() => {
    if (window.webln) {
      setWebLNAvailable(true);
    }
  }, []);

  return { weblnAvailable, webLn, setWebln };
};
