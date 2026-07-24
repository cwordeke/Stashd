import { NextResponse } from "next/server";
import { getPopularForType } from "@/lib/popular";
import type { MediaType } from "@/lib/types";

const VALID: MediaType[] = ["movie", "tv", "game", "book", "music"];

export async function GET(
  _request: Request,
  context: { params: Promise<{ type: string }> }
) {
  const { type } = await context.params;

  if (!VALID.includes(type as MediaType)) {
    return NextResponse.json(
      { results: [], error: "Invalid media type" },
      { status: 400 }
    );
  }

  const { results, source } = await getPopularForType(type as MediaType);
  return NextResponse.json({ results, source });
}
