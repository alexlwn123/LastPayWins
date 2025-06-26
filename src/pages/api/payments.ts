import { readLnurl } from "@/lib/lightning";

export default async (req, res) => {
	// Check lnrul
	if (req.method === "GET") {
		const body = req.query.lnurl;
		const data = await readLnurl(body);
		res.status(200).json(data);
		// make payment
		// } else if (req.method === 'POST') {
		// const data = await payLnurl() as {status: string, error?: string};
		// if (data.status === 'failed') {
		//   res.status(400).json(data);
		//   return;
		// }
		// res.status(200).json(data)
	}
};
