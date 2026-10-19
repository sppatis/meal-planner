import { promises as fs } from "fs";
import path from "path";
import { LOCAL_PHOTO_DIR } from "@/lib/store/local";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[file]">) {
  const { file } = await ctx.params;
  const name = path.basename(file);
  try {
    const data = await fs.readFile(path.join(LOCAL_PHOTO_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
