import pusher, { getLastPayer, updateLastPayer } from '../../lib/pusher';
let jackpot = 0;
export default async (req, res) => {
  try {
    if (req.method === 'GET') {
      const lastPlayer = await getLastPayer();
      res.status(200).json({ message: 'ok', data: lastPlayer });
    } else if (req.method === 'POST') {
      jackpot += 1000;
      const rawState = await pusher.get({path: '/channels/cache-last-payer'});
      const state = await rawState.json();
      await pusher.trigger('cache-last-payer', 'update', {lnAddress: 'test', timestamp: Date.now(), jackpot: jackpot});
      updateLastPayer('testy', Date.now());
      res.status(200).json({ message: 'ok', data: {lnAddress: 'test', timestamp: Date.now(), jackpot: jackpot}})
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}