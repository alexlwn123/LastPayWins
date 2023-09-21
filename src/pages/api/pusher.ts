import { authorizeUser } from "@/lib/pusher";

export default async (req, res) => {
  if (req.method === 'POST') {
    const socketId = req.body.socket_id;
    const uuid = req.query.uuid;
    // console.log("socketId", socketId, "userid", uuid);
    const authResponse = await authorizeUser(socketId, uuid);
    res.send(authResponse);
  }
};