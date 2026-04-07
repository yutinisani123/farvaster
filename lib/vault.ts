export type StoredAccount = {
  id: string;
  label: string;
  kind: "mnemonic" | "privateKey";
  encryptedSecret: string;
  address: string;
  derivationIndex: number;
  importedAt: string;
};

export type VaultPayload = {
  version: 1;
  createdAt: string;
  accounts: StoredAccount[];
};

type EncryptedVault = {
  cipherText: string;
  iv: string;
  salt: string;
};

const STORAGE_KEY = "fc_multi_vault";

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

export async function encryptVault(payload: VaultPayload, secret: string) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  const encrypted: EncryptedVault = {
    cipherText: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

export async function decryptVault(secret: string): Promise<VaultPayload | null> {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  const encrypted = JSON.parse(raw) as EncryptedVault;
  const key = await deriveKey(secret, fromBase64(encrypted.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encrypted.iv),
    },
    key,
    fromBase64(encrypted.cipherText),
  );

  return JSON.parse(new TextDecoder().decode(plainBuffer)) as VaultPayload;
}

export function clearVault() {
  window.localStorage.removeItem(STORAGE_KEY);
}
