export type AuthState =
  | "idle"
  | "checking-context"
  | "unauthenticated"
  | "authenticating"
  | "authenticated"
  | "error";

export type MeResponse = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  primaryAddress?: string;
};

export type ActionResponse = {
  ok: true;
  message: string;
  fid: number;
  requestedAt: string;
};

export type ErrorResponse = {
  error: string;
};

export type QuickAuthJwtPayload = {
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string | number;
  [key: string]: unknown;
};

export type NeynarUserResponse = {
  users?: Array<{
    fid: number;
    username?: string;
    display_name?: string;
    pfp_url?: string;
    verified_addresses?: {
      primary?: {
        eth_address?: string;
      };
    };
  }>;
};

