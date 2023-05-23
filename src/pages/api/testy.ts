import pusher, { getLastPayer, updateLastPayer } from '../../lib/pusher';
let jackpot = 0;
export default async (req, res) => {
  try {
    if (req.method === 'PATCH') {
      await pusher.trigger('cache-last-payer', 'update', {lnAddress: 'None!', timestamp: Date.now(), jackpot: 0});
      res.status(200).json({ message: 'ok' });
    } else if (req.method === 'GET') {
      const lastPlayer = await getLastPayer();
      res.status(200).json({ message: 'ok', data: lastPlayer });
    } else if (req.method === 'POST') {
      jackpot = jackpot + parseInt(process.env.INVOICE_AMOUNT ?? '0');
      const rawState = await pusher.get({path: '/channels/cache-last-payer'});
      const state = await rawState.json();
      console.log('testy - cached state', state);
      const newPayer = updateLastPayer('alexl@getalby.com', Date.now(), false);
      res.status(200).json({ message: 'ok', data: newPayer})
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}