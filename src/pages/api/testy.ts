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
      jackpot = jackpot + parseInt(process.env.NEXT_PUBLIC_INVOICE_AMOUNT ?? '0');
      const rawState = await pusher.get({path: `/channels/${channel}`, params: {info: ['cache']}});
      const state = await rawState.json();
      console.log('testy - cached state', state);
      const event = {
        "content": "hello world",
        "created_at": 1687269280,
        "id": "916fd1914b73ee48257677dc32dcc7a924882710a5e1e3e4c3be78166e5ae181",
        "kind": 1,
        "pubkey": "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        "sig": "52a9ddbf3161e058f67c918526c5c56cc283839a7eedcd08de635ee28ede75ddfb8b0841aa1ea82c72e77a028e6237c6deeacce117052fcb3c3dbc1765a3f0fc",
        "tags": []
      }
      const newPayer = updateLastPayer('alexl@getalby.com', event);
      res.status(200).json({ message: 'ok', data: newPayer, time: new Date().toString()})
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