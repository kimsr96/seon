import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const participants = await prisma.participant.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return Response.json(participants);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const participant = await prisma.participant.create({ data: body });
  return Response.json(participant, { status: 201 });
}
