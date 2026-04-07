type EncryptedPayload = {
  cipherText: string;
  iv: string;
  salt: string;
};

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function deriveKey(secret: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function getWorkspaceKey(loginId: string) {
  return `fc_workspace_${loginId.trim().toLowerCase()}`;
}

export function workspaceExists(loginId: string) {
  return Boolean(window.localStorage.getItem(getWorkspaceKey(loginId)));
}

export async function saveEncryptedWorkspace<T>(loginId: string, password: string, payload: T) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  const encrypted: EncryptedPayload = {
    cipherText: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };

  window.localStorage.setItem(getWorkspaceKey(loginId), JSON.stringify(encrypted));
  window.localStorage.setItem("fc_workspace_last_login_id", loginId);
}

export async function loadEncryptedWorkspace<T>(loginId: string, password: string): Promise<T | null> {
  const raw = window.localStorage.getItem(getWorkspaceKey(loginId));

  if (!raw) {
    return null;
  }

  const encrypted = JSON.parse(raw) as EncryptedPayload;
  const key = await deriveKey(password, fromBase64(encrypted.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encrypted.iv),
    },
    key,
    fromBase64(encrypted.cipherText),
  );

  return JSON.parse(new TextDecoder().decode(plainBuffer)) as T;
}

export function clearWorkspace(loginId: string) {
  window.localStorage.removeItem(getWorkspaceKey(loginId));
}

export function getLastLoginId() {
  return window.localStorage.getItem("fc_workspace_last_login_id") || "";
}
