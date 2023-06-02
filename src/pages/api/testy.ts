import { checkLnbitsInvoice } from '@/lib/lnbits';
import pusher, { getLastPayer, updateLastPayer } from '../../lib/pusher';
let jackpot = 0;
export default async (req, res) => {
  // console.log('HEEER', res.socket);
  // console.log('HEEER', typeof res.socket);
  const channel = process.env.NEXT_PUBLIC_PUSHER_CHANNEL!;
  try {
    if (req.method === 'DELETE') {
      await pusher.trigger(channel, 'update', {lnAddress: 'None!', timestamp: Date.now(), jackpot: 0});
      res.status(200).json({ message: 'ok' });
    } else if (req.method === 'GET') {
      const hash = req.query.hash;
      const data = await checkLnbitsInvoice(hash);
      // const lastPlayer = await getLastPayer();
      res.status(200).json({ message: 'ok', data });
    } else if (req.method === 'POST') {
      jackpot = jackpot + parseInt(process.env.INVOICE_AMOUNT ?? '0');
      const rawState = await pusher.get({path: `/channels/${channel}`, params: {info: ['cache']}});
      const state = await rawState.json();
      console.log('testy - cached state', state);
      const newPayer = updateLastPayer('alexl@getalby.com');
      res.status(200).json({ message: 'ok', data: newPayer})
    } else if (req.method === 'PATCH') {
      const body = req.body;
      await pusher.trigger(channel, 'update', {lnAddress: body.lnAddress, timestamp: Date.now(), jackpot: body.jackpot});
      const rawState = await pusher.get({path: `/channels/${channel}`, params: {info: ['cache']}});
      const state = await rawState.json();
      res.status(200).json(state)
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}