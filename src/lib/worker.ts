addEventListener('message', (event: MessageEvent<number>) => {
  postMessage(event.data)
});

self.onmessage = (event) => {
  if (event.data.command === 'start checking invoice') {
    const invoiceHash = event.data.hash;
    const userAddress = event.data.userAddress;
    const url = `/api/invoice?hash=${encodeURIComponent(invoiceHash)}&lnaddr=${userAddress}`
    const interval = setInterval(() => {
      fetch(url, { method: 'GET' })
        .then((response) => response.json())
        .then((data) => {
          if (!data.settled) return;
          localStorage.setItem('lnaddr', userAddress);
          self.postMessage({ status: 'invoice paid' });
          clearInterval(interval);
        }).catch(_ => clearInterval(interval));
    }, 1000);
  } 
};