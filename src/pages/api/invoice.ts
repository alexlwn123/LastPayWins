import { updateLastPayer } from '../../lib/pusher';
import { checkLnbitsInvoice, getLnbitsInvoice } from "@/lib/lnbits";

const checkInvoice = async (hash, lnAddress) => {
  const data = await checkLnbitsInvoice(hash) as {paid: boolean};
  if (data.paid) {
    await updateLastPayer(lnAddress);
  }
  return { settled: data.paid }
};

export default async (req, res) => {
  try {
    if (req.method === 'POST') {
      const data = await getLnbitsInvoice();
      res.status(200).json(data);
    } else if (req.method === 'GET') {
      const rHash = decodeURIComponent(req.query.hash);
      const lnAddress = req.query.lnaddr;
      const data = await checkInvoice(rHash, lnAddress);
      res.status(200).json(data);
    // } else if (req.method === 'PATCH'){ 
    //   const data = await getLnbitsInvoice();
    //   res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}