import { NextRequest, NextResponse } from "next/server";
import kv from "@/lib/kv";
import { nanoid } from "nanoid";

function now(req: NextRequest) {
  if (process.env.TEST_MODE === "1") {
    return Number(req.headers.get("x-test-now-ms"));
  }
  return Date.now();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { content, ttl_seconds, max_views } = body;

  if (!content || typeof content !== "string")
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });

  if (ttl_seconds && ttl_seconds < 1)
    return NextResponse.json({ error: "Invalid ttl" }, { status: 400 });

  if (max_views && max_views < 1)
    return NextResponse.json({ error: "Invalid max_views" }, { status: 400 });

  const id = nanoid(8);
  const createdAt = now(req);

  const paste = {
    content,
    created_at: createdAt,
    expires_at: ttl_seconds ? createdAt + ttl_seconds * 1000 : null,
    max_views: max_views ?? null,
    views: 0,
  };

  await kv.set(`paste:${id}`, paste);

  return NextResponse.json({
    id,
    url: `${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"}/p/${id}`,
  });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const paste = await kv.get<any>(`paste:${id}`);
  if (!paste) return NextResponse.json({}, { status: 404 });

  const nowTime = now(req);

  if (
    (paste.expires_at && nowTime >= paste.expires_at) ||
    (paste.max_views !== null && paste.views >= paste.max_views)
  ) {
    return NextResponse.json({}, { status: 404 });
  }

  paste.views += 1;
  await kv.set(`paste:${id}`, paste);

  return NextResponse.json({
    content: paste.content,
    remaining_views:
      paste.max_views === null ? null : paste.max_views - paste.views,
    expires_at: paste.expires_at
      ? new Date(paste.expires_at).toISOString()
      : null,
  });
}
