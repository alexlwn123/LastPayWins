import { readLnurl } from "@/lib/lightning";

export default async (req, res) => {
	if (req.method === "GET") {
		const lnurl = req.query.lnurl;
		const data = await readLnurl(lnurl);
		res.status(200).json(data);
	}
};
