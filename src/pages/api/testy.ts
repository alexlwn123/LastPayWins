import pusher from '../../lib/pusher';
let jackpot = 0;
export default async (req, res) => {
  try {
    if (req.method === 'GET') {
      console.log(pusher);
      pusher.trigger("timer", "reset", {});
      res.status(200).json({ message: 'ok' });
    } else if (req.method === 'POST') {
      jackpot += 1000;
      await pusher.trigger('last-payer', 'update', {lnAddress: 'test', timestamp: Date.now(), jackpot: jackpot});
      res.status(200).json({ message: 'ok', data: {lnAddress: 'test', timestamp: Date.now(), jackpot: jackpot}})
      // const rHash = req.query.hash;
      // const data = await checkInvoice(rHash);
      // console.log(data);
      // res.status(200).json(data);
    } else {
      res.status(405).json({ error: 'Method not supported' });
    }
  } catch (e) {
    console.error(e)
    res.status(500).json(e);
  }

}