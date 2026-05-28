import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? "2026-W09";
  const items = await prisma.expectedProject.findMany({
    where: { weekLabel: week },
    orderBy: { orderNum: "asc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.expectedProject.create({ data: body });
  return Response.json(item, { status: 201 });
}
