import { NextRequest, NextResponse } from "next/server";

import { buildAuthenticatedUser } from "@/lib/auth";
import type { ErrorResponse, MeResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await buildAuthenticatedUser(request);
    return NextResponse.json<MeResponse>(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized request.";

    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 401 },
    );
  }
}
