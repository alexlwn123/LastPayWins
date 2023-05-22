import fetch from 'node-fetch';
const readLnurl = async (lnurl: string) => { 

  const url = `${process.env.LNBITS_URL!}/api/v1/lnurlscan/${lnurl}`;
  const data = await fetch(url, {
    method: 'GET',
    headers: {
      'Grpc-Metadata-macaroon': process.env.MACAROON!,
      'Content-Type': 'application/json',
      'x-api-key': process.env.LNBITS_API_KEY!,
    },
  });
  if (data.status !== 200) {
    return { error: data.statusText };
  }
  const rawResult = await data.json();
  console.log(rawResult)
  return rawResult;

};