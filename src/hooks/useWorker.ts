import { useEffect, useRef } from "react";

export const useWorker = (setSettled, setCountdownKey, setHash, toast) => {
  const worker = useRef<Worker>();

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    worker.current = new Worker(new URL('../lib/worker.ts', import.meta.url));
    worker.current.onmessage = (e: MessageEvent) => {
      console.log('🍏 Message received from worker: ', e.data);
      if (e.data.command === 'invoice paid') {
        setSettled(true);
        setCountdownKey(prevKey => prevKey + 1);
        setHash(null);
        toast("Bid Received! You're in the lead!", { type: 'success' });
      }
    };
    worker.current.onerror = (e: ErrorEvent) => {
      if (e instanceof Event) {
        console.log('🍎 Error received from worker: ', e);
        return e;
      } 
      console.log('🍎 Worker Error: ', e);
      throw e;
    };
    return () => {
      worker.current?.terminate();
    };

  }, []);

  document.addEventListener('visibilitychange', () => {
    if (worker.current && !document.hidden) {
      worker.current.postMessage({ command: 'tab visible' });
    }
  });

  return { worker };

}