import { NextResponse } from "next/server";
import { getMediaDetails } from "@/lib/providers/details";
import { isMediaType } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaType: string; id: string }> }
) {
  const { mediaType, id } = await context.params;

  if (!isMediaType(mediaType)) {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const details = await getMediaDetails(mediaType, id);
    return NextResponse.json({ details });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load media details";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
