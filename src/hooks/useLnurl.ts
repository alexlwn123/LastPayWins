import { useEffect, useState } from "react";
import { validateLnurl } from "@/app/utils";
// import { readLnurl, type ScanResult } from "@/lib/lightning";

export const useLnurl = () => {
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');

  // get lnaddr from local storage
  useEffect(() => {
    const lnaddr = localStorage.getItem("lnaddr");
    if (lnaddr) {
      setTimeout(() => setUserAddress(lnaddr), 0);
    }
  }, []);

  useEffect(() => {
    const delayedValidate = setTimeout(async () => {
      if (!userAddress) return;
      setIsValidatingAddress(true);
      const res = await validateLnurl(userAddress);
      setIsValidatingAddress(false);
      setIsValidAddress(res.valid);
      if (res.valid) {
        localStorage.setItem("lnaddr", userAddress);
      }
    }, 300);
    return () => clearTimeout(delayedValidate);
  }, [userAddress]);

  return { userAddress, setUserAddress, isValidatingAddress, isValidAddress };
};
