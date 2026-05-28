import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const participant = await prisma.participant.update({ where: { id: Number(id) }, data: body });
  return Response.json(participant);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.participant.delete({ where: { id: Number(id) } });
  return new Response(null, { status: 204 });
}
