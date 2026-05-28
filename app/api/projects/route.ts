import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ orderBy: [{ category: "asc" }, { orderNum: "asc" }] });
    return Response.json(projects);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = await prisma.project.create({ data: body });
  return Response.json(project, { status: 201 });
}
