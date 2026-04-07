import { NextRequest, NextResponse } from "next/server";

import { verifyQuickAuthFromRequest } from "@/lib/auth";
import type { ActionResponse, ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { fid } = await verifyQuickAuthFromRequest(request);

    return NextResponse.json<ActionResponse>({
      ok: true,
      fid,
      message: `Protected backend action completed for fid ${fid}.`,
      requestedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized request.";

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 401 },
    );
  }
}
