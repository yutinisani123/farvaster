import { createClient } from "@farcaster/quick-auth";
import { NextRequest } from "next/server";

import { getAppDomain } from "@/lib/env";
import type { MeResponse, NeynarUserResponse, QuickAuthJwtPayload } from "@/lib/types";

const quickAuthClient = createClient();

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeQuickAuthPayload(token: string): QuickAuthJwtPayload {
  const parts = token.split(".");

  if (parts.length < 2) {
    throw new Error("Quick Auth token is malformed.");
  }

  return JSON.parse(decodeBase64Url(parts[1])) as QuickAuthJwtPayload;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new Error("Missing Authorization header.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Authorization header must use Bearer token.");
  }

  return token;
}

async function fetchNeynarProfile(fid: number): Promise<Partial<MeResponse>> {
  const apiKey = process.env.NEYNAR_API_KEY?.trim();

  if (!apiKey) {
    return {};
  }

  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    {
      headers: {
        "x-api-key": apiKey,
      },
      next: { revalidate: 300 },
    },
  );

  if (!response.ok) {
    return {};
  }

  const data = (await response.json()) as NeynarUserResponse;
  const user = data.users?.[0];

  if (!user) {
    return {};
  }

  return {
    username: user.username,
    displayName: user.display_name,
    pfpUrl: user.pfp_url,
    primaryAddress: user.verified_addresses?.primary?.eth_address,
  };
}

export async function verifyQuickAuthFromRequest(request: NextRequest) {
  const token = getBearerToken(request);

  await quickAuthClient.verifyJwt({
    token,
    domain: getAppDomain(),
  });

  const payload = decodeQuickAuthPayload(token);
  const fid = Number(payload.sub);

  if (!Number.isFinite(fid) || fid <= 0) {
    throw new Error("Verified token did not contain a valid fid.");
  }

  return {
    fid,
    payload,
    token,
  };
}

export async function buildAuthenticatedUser(request: NextRequest): Promise<MeResponse> {
  const { fid } = await verifyQuickAuthFromRequest(request);
  const profile = await fetchNeynarProfile(fid);

  return {
    fid,
    ...profile,
  };
}
