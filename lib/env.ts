const localhostDefault = "http://localhost:3000";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getBaseUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_URL || localhostDefault);
}

export function getAppDomain() {
  const explicit = process.env.FARCASTER_APP_DOMAIN?.trim();

  if (explicit) {
    return explicit;
  }

  try {
    return new URL(getBaseUrl()).host;
  } catch {
    return "localhost:3000";
  }
}

export function getQuickAuthServerOrigin() {
  return (
    process.env.FARCASTER_QUICK_AUTH_SERVER_ORIGIN?.trim() ||
    "https://auth.farcaster.xyz"
  );
}

export function getAppName() {
  return process.env.FARCASTER_APP_NAME?.trim() || "Farcaster Automation Vault";
}

export function getAppDescription() {
  return (
    process.env.FARCASTER_APP_DESCRIPTION?.trim() ||
    "Local multi-account dashboard for Farcaster-targeted transaction workflows."
  );
}

export function getButtonTitle() {
  return process.env.FARCASTER_BUTTON_TITLE?.trim() || "Open Mini App";
}

export function getPrimaryCategory() {
  return process.env.FARCASTER_PRIMARY_CATEGORY?.trim() || "developer-tools";
}

export function getTags() {
  const raw = process.env.FARCASTER_TAGS?.trim();

  if (!raw) {
    return ["farcaster", "miniapp", "auth", "developer-tools"];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getSplashBackgroundColor() {
  return process.env.FARCASTER_SPLASH_BACKGROUND_COLOR?.trim() || "#0b101b";
}

export function getAccountAssociation() {
  const header = process.env.FARCASTER_HEADER?.trim();
  const payload = process.env.FARCASTER_PAYLOAD?.trim();
  const signature = process.env.FARCASTER_SIGNATURE?.trim();

  if (!header || !payload || !signature) {
    return undefined;
  }

  return { header, payload, signature };
}

export function getHostedManifestId() {
  return process.env.FARCASTER_HOSTED_MANIFEST_ID?.trim() || "";
}
