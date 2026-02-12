import type { NextRequest } from "next/server";
import { authorizeUser } from "@/lib/pusher";

export const POST = async (req: NextRequest) => {
  const form = await req.formData();
  const socketId = form.get("socket_id")?.toString();
  const uuid = req.nextUrl.searchParams.get("uuid");
  if (!socketId) {
    return new Response("Missing socket_id", { status: 400 });
  }
  if (!uuid) {
    return new Response("Missing uuid", { status: 400 });
  }
  const authResponse = await authorizeUser(socketId, uuid);
  return Response.json(authResponse);
};
