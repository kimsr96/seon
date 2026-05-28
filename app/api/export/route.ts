import { prisma } from "@/lib/prisma";
import { spawn } from "child_process";
import path from "path";

async function runPython(scriptPath: string, input: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    const proc = spawn("python3", [scriptPath]);

    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

    proc.on("close", (code) => {
      if (code !== 0) {
        const errMsg = Buffer.concat(errChunks).toString();
        reject(new Error(`Python 종료코드 ${code}: ${errMsg}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });

    proc.on("error", reject);
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

export async function GET() {
  const [projects, participants] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ category: "asc" }, { orderNum: "asc" }] }),
    prisma.participant.findMany({ orderBy: { role: "asc" } }),
  ]);

  const payload = JSON.stringify({ projects, participants });
  const scriptPath = path.resolve(process.cwd(), "scripts/generate_hwpx.py");

  let hwpxBuffer: Buffer;
  try {
    hwpxBuffer = await runPython(scriptPath, payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("HWPX 생성 실패:", msg);
    return new Response("HWPX 생성 실패: " + msg, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `주간업무_${today}.hwpx`;

  return new Response(new Uint8Array(hwpxBuffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
