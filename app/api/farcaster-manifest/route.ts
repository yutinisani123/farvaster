import { NextResponse } from "next/server";

import { getHostedManifestId } from "@/lib/env";
import { buildMiniAppManifest } from "@/lib/farcaster";

export const runtime = "nodejs";

export function GET() {
  const hostedManifestId = getHostedManifestId();

  if (hostedManifestId) {
    return NextResponse.redirect(
      `https://api.farcaster.xyz/miniapps/hosted-manifest/${hostedManifestId}`,
      307,
    );
  }

  return NextResponse.json(buildMiniAppManifest(), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
