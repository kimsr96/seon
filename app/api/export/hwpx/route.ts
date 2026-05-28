import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week") ?? "2026-W09";

  const [projects, expectedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { weekLabel: week },
      orderBy: [{ category: "asc" }, { orderNum: "asc" }],
    }),
    prisma.expectedProject.findMany({
      where: { weekLabel: week },
      orderBy: { orderNum: "asc" },
    }),
  ]);

  const payload = JSON.stringify({ projects, expectedProjects, weekLabel: week });

  const scriptPath = path.join(process.cwd(), "scripts", "generate_hwpx.py");

  const hwpxBuffer = await new Promise<Buffer>((resolve, reject) => {
    const py = spawn("python3", [scriptPath]);
    const chunks: Buffer[] = [];

    py.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    py.stderr.on("data", (d: Buffer) => console.error("[HWPX]", d.toString()));
    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Python exited with code ${code}`));
      resolve(Buffer.concat(chunks));
    });
    py.on("error", reject);

    py.stdin.write(payload);
    py.stdin.end();
  });

  const filename = `미래사업팀_주간업무_${week}.hwpx`;
  return new Response(hwpxBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
