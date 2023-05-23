import { useEffect, useState } from "react";

declare global {
  interface Window {
    webln: any
  }
}
const useWeblnAvailable = () => {
  const [ weblnAvailable, setWebLNAvailable] = useState<boolean>(false)

  useEffect(() => {
    if (window.webln) {
      setWebLNAvailable(true)
    }
  }, [])

  return weblnAvailable
};

export default useWeblnAvailable;
