"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

import {
  clearVault,
  decryptVault,
  encryptVault,
  type StoredAccount,
  type VaultPayload,
} from "@/lib/vault";

type UnlockState = "locked" | "ready";
type ModuleKey = "plinks" | "custom";
type TransactionStatus = "idle" | "running" | "success" | "error";

const defaultVault: VaultPayload = {
  version: 1,
  createdAt: new Date(0).toISOString(),
  accounts: [],
};

const defaultRpc = "https://mainnet.base.org";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

function maskAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function AutomationDashboard() {
  const [unlockState, setUnlockState] = useState<UnlockState>("locked");
  const [unlockSecret, setUnlockSecret] = useState("");
  const [vault, setVault] = useState<VaultPayload>(defaultVault);
  const [vaultMessage, setVaultMessage] = useState(
    "Vault belum dibuka. Semua akun akan disimpan terenkripsi di browser ini saja.",
  );

  const [label, setLabel] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [secretType, setSecretType] = useState<StoredAccount["kind"]>("mnemonic");
  const [derivationIndex, setDerivationIndex] = useState("0");
  const [importMessage, setImportMessage] = useState(
    "Gunakan mnemonic atau private key untuk impor akun lokal. Jangan pakai mesin yang tidak kamu percaya.",
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [moduleKey, setModuleKey] = useState<ModuleKey>("plinks");
  const [rpcUrl, setRpcUrl] = useState(defaultRpc);
  const [chainId, setChainId] = useState("8453");
  const [toAddress, setToAddress] = useState("");
  const [ethValue, setEthValue] = useState("0");
  const [calldata, setCalldata] = useState("0x");
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState<TransactionStatus>("idle");
  const [txMessage, setTxMessage] = useState(
    "Modul tx siap. Untuk Plinks, isi target contract/API yang benar setelah kamu tahu address dan calldata aksinya.",
  );

  useEffect(() => {
    const hasVault = typeof window !== "undefined" && window.localStorage.getItem("fc_multi_vault");

    if (!hasVault) {
      setVaultMessage(
        "Belum ada vault. Buat password unlock lalu impor akun pertama untuk mulai automation.",
      );
    }
  }, []);

  const selectedAccount = useMemo(
    () => vault.accounts.find((item) => item.id === selectedAccountId) ?? null,
    [selectedAccountId, vault.accounts],
  );

  function deriveAddress(kind: StoredAccount["kind"], secret: string, index: number) {
    if (kind === "mnemonic") {
      return mnemonicToAccount(secret.trim(), {
        addressIndex: index,
      }).address;
    }

    return privateKeyToAccount(secret.trim() as `0x${string}`).address;
  }

  async function handleUnlock() {
    try {
      if (!unlockSecret.trim()) {
        throw new Error("Isi password vault dulu.");
      }

      const existing = await decryptVault(unlockSecret.trim());

      if (existing) {
        setVault(existing);
        setSelectedAccountId(existing.accounts[0]?.id ?? "");
        setVaultMessage(`Vault terbuka. ${existing.accounts.length} akun siap dipakai.`);
      } else {
        const freshVault: VaultPayload = {
          version: 1,
          createdAt: new Date().toISOString(),
          accounts: [],
        };
        await encryptVault(freshVault, unlockSecret.trim());
        setVault(freshVault);
        setVaultMessage("Vault baru dibuat. Sekarang kamu bisa impor akun.");
      }

      setUnlockState("ready");
    } catch (error) {
      setVaultMessage(getErrorMessage(error));
    }
  }

  async function handleImportAccount() {
    try {
      if (unlockState !== "ready") {
        throw new Error("Buka vault dulu sebelum impor akun.");
      }

      const index = Number(derivationIndex);

      if (!Number.isInteger(index) || index < 0) {
        throw new Error("Derivation index harus angka 0 atau lebih.");
      }

      if (!secretValue.trim()) {
        throw new Error("Isi mnemonic atau private key.");
      }

      const address = deriveAddress(secretType, secretValue, index);
      const nextAccount: StoredAccount = {
        id: crypto.randomUUID(),
        label: label.trim() || `Account ${vault.accounts.length + 1}`,
        kind: secretType,
        encryptedSecret: secretValue.trim(),
        address,
        derivationIndex: secretType === "mnemonic" ? index : 0,
        importedAt: new Date().toISOString(),
      };

      const nextVault: VaultPayload = {
        ...vault,
        accounts: [...vault.accounts, nextAccount],
      };

      await encryptVault(nextVault, unlockSecret.trim());
      setVault(nextVault);
      setSelectedAccountId(nextAccount.id);
      setSecretValue("");
      setLabel("");
      setDerivationIndex("0");
      setImportMessage(`Akun ${nextAccount.label} masuk ke vault lokal.`);
    } catch (error) {
      setImportMessage(getErrorMessage(error));
    }
  }

  async function handleClearVault() {
    clearVault();
    setUnlockState("locked");
    setVault(defaultVault);
    setSelectedAccountId("");
    setUnlockSecret("");
    setVaultMessage("Vault lokal dihapus dari browser ini.");
  }

  async function handleRunTransaction() {
    try {
      if (!selectedAccount) {
        throw new Error("Pilih akun dulu.");
      }

      if (!isAddress(toAddress)) {
        throw new Error("Alamat tujuan tx tidak valid.");
      }

      if (!rpcUrl.trim()) {
        throw new Error("RPC URL wajib diisi.");
      }

      if (!/^0x[0-9a-fA-F]*$/.test(calldata.trim())) {
        throw new Error("Calldata harus hex string berawalan 0x.");
      }

      setTxStatus("running");
      setTxHash("");
      setTxMessage("Mengirim transaksi...");

      const account =
        selectedAccount.kind === "mnemonic"
          ? mnemonicToAccount(selectedAccount.encryptedSecret, {
              addressIndex: selectedAccount.derivationIndex,
            })
          : privateKeyToAccount(selectedAccount.encryptedSecret as `0x${string}`);

      const walletClient = createWalletClient({
        account,
        chain: undefined,
        transport: http(rpcUrl.trim()),
      });

      const publicClient = createPublicClient({
        transport: http(rpcUrl.trim()),
      });

      const hash = await walletClient.sendTransaction({
        account,
        chain: undefined,
        to: toAddress as `0x${string}`,
        data: calldata.trim() as `0x${string}`,
        value: parseEther(ethValue || "0"),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      setTxStatus("success");
      setTxHash(hash);
      setTxMessage(
        `Tx sukses untuk ${selectedAccount.label}. Gas used: ${receipt.gasUsed.toString()}.`,
      );
    } catch (error) {
      setTxStatus("error");
      setTxMessage(getErrorMessage(error));
    }
  }

  const totalAccounts = vault.accounts.length;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">Local Multi Account | Miniapp Automation</div>
        <h1 className="title">Dashboard akun banyak untuk automation miniapp.</h1>
        <p className="lede">
          Tool ini memprioritaskan signer lokal terenkripsi. Akun disimpan di
          browser ini saja, lalu kamu bisa menyiapkan transaksi per akun untuk
          miniapp target seperti Plinks atau modul EVM custom lainnya.
        </p>
      </section>

      <section className="layout-grid">
        <article className="card main-card">
          <div className="status-pill">
            <span className="dot" />
            <span>{unlockState === "ready" ? `${totalAccounts} accounts loaded` : "vault locked"}</span>
          </div>

          <div className="sections">
            <section className="card info-card">
              <h2 className="card-title">Vault lokal</h2>
              <p className="card-copy">
                Password ini dipakai untuk mengenkripsi data akun di
                `localStorage`. Tidak ada seed phrase yang dikirim ke server app
                ini.
              </p>
              <div className="stack">
                <div className="kv">
                  <span className="kv-label">Vault password</span>
                  <input
                    className="field"
                    type="password"
                    value={unlockSecret}
                    onChange={(event) => setUnlockSecret(event.target.value)}
                    placeholder="Masukkan password vault"
                  />
                </div>
                <div className="button-row">
                  <button className="button" type="button" onClick={handleUnlock}>
                    {unlockState === "ready" ? "Re-open Vault" : "Unlock Vault"}
                  </button>
                  <button className="button secondary" type="button" onClick={handleClearVault}>
                    Clear Local Vault
                  </button>
                </div>
                <div className="message info">{vaultMessage}</div>
              </div>
            </section>

            <div className="grid-two">
              <section className="card info-card">
                <h2 className="card-title">Import akun</h2>
                <p className="card-copy">
                  Untuk multi-account, impor satu per satu ke vault lokal.
                  Mnemonic akan diderive ke address sesuai index yang kamu pilih.
                </p>
                <div className="stack">
                  <div className="kv">
                    <span className="kv-label">Label akun</span>
                    <input
                      className="field"
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      placeholder="Contoh: Plinks Wallet 01"
                    />
                  </div>
                  <div className="kv">
                    <span className="kv-label">Jenis secret</span>
                    <select
                      className="field"
                      value={secretType}
                      onChange={(event) => setSecretType(event.target.value as StoredAccount["kind"])}
                    >
                      <option value="mnemonic">Mnemonic / seed phrase</option>
                      <option value="privateKey">Private key</option>
                    </select>
                  </div>
                  <div className="kv">
                    <span className="kv-label">Secret</span>
                    <textarea
                      className="field field-area"
                      value={secretValue}
                      onChange={(event) => setSecretValue(event.target.value)}
                      placeholder="Masukkan mnemonic atau private key"
                    />
                  </div>
                  <div className="kv">
                    <span className="kv-label">Derivation index</span>
                    <input
                      className="field"
                      value={derivationIndex}
                      onChange={(event) => setDerivationIndex(event.target.value)}
                      placeholder="0"
                      disabled={secretType !== "mnemonic"}
                    />
                  </div>
                  <button className="button" type="button" onClick={handleImportAccount}>
                    Import Account
                  </button>
                  <div className="message info">{importMessage}</div>
                </div>
              </section>

              <section className="card info-card">
                <h2 className="card-title">Akun tersimpan</h2>
                <p className="card-copy">
                  Pilih akun yang ingin dipakai untuk tx. Semua data ini tetap
                  lokal di browser, tidak masuk ke backend project.
                </p>
                <div className="stack">
                  <select
                    className="field"
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    <option value="">Pilih akun</option>
                    {vault.accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label} | {maskAddress(item.address)}
                      </option>
                    ))}
                  </select>
                  <div className="kv">
                    <span className="kv-label">Selected address</span>
                    <span className="kv-value">{selectedAccount?.address || "Belum dipilih"}</span>
                  </div>
                  <div className="kv">
                    <span className="kv-label">Import time</span>
                    <span className="kv-value">{selectedAccount?.importedAt || "Belum dipilih"}</span>
                  </div>
                </div>
              </section>
            </div>

            <section className="card action-card">
              <h2 className="card-title">Module runner</h2>
              <p className="card-copy">
                Modul `Plinks` disiapkan sebagai preset workflow, tapi tetap
                butuh contract address, calldata, atau API detail yang benar.
                Sementara itu modul `Custom EVM Tx` bisa dipakai untuk submit tx
                manual ke miniapp target.
              </p>
              <div className="stack">
                <div className="kv">
                  <span className="kv-label">Module</span>
                  <select
                    className="field"
                    value={moduleKey}
                    onChange={(event) => setModuleKey(event.target.value as ModuleKey)}
                  >
                    <option value="plinks">Plinks adapter (manual target)</option>
                    <option value="custom">Custom EVM transaction</option>
                  </select>
                </div>
                <div className="grid-two">
                  <div className="kv">
                    <span className="kv-label">RPC URL</span>
                    <input
                      className="field"
                      value={rpcUrl}
                      onChange={(event) => setRpcUrl(event.target.value)}
                    />
                  </div>
                  <div className="kv">
                    <span className="kv-label">Chain ID</span>
                    <input
                      className="field"
                      value={chainId}
                      onChange={(event) => setChainId(event.target.value)}
                    />
                  </div>
                </div>
                <div className="kv">
                  <span className="kv-label">Target contract / recipient</span>
                  <input
                    className="field"
                    value={toAddress}
                    onChange={(event) => setToAddress(event.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="grid-two">
                  <div className="kv">
                    <span className="kv-label">ETH value</span>
                    <input
                      className="field"
                      value={ethValue}
                      onChange={(event) => setEthValue(event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="kv">
                    <span className="kv-label">Estimated value</span>
                    <span className="kv-value">
                      {(() => {
                        try {
                          return formatEther(parseEther(ethValue || "0"));
                        } catch {
                          return "Invalid";
                        }
                      })()}{" "}
                      ETH
                    </span>
                  </div>
                </div>
                <div className="kv">
                  <span className="kv-label">Calldata</span>
                  <textarea
                    className="field field-area"
                    value={calldata}
                    onChange={(event) => setCalldata(event.target.value)}
                    placeholder="0x"
                  />
                </div>
                <div className="button-row">
                  <button className="button" type="button" onClick={handleRunTransaction}>
                    Send Transaction
                  </button>
                </div>
                <div className={`message ${txStatus === "error" ? "error" : txStatus === "success" ? "success" : "info"}`}>
                  {txMessage}
                </div>
                <div className="kv">
                  <span className="kv-label">Latest tx hash</span>
                  <span className="kv-value">{txHash || "Belum ada transaksi"}</span>
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="card main-card">
          <h2 className="card-title">Status & next step</h2>
          <p className="card-copy">
            Fondasi multi-account sudah siap untuk signer lokal. Yang masih perlu
            dicari khusus untuk Plinks adalah alamat contract, calldata, atau API
            resmi aksi yang ingin kamu otomatisasi.
          </p>
          <div className="stack">
            <div className="kv">
              <span className="kv-label">Current scope</span>
              <span className="kv-value">
                Local encrypted vault, many accounts, modular tx runner
              </span>
            </div>
            <div className="kv">
              <span className="kv-label">Blocked by</span>
              <span className="kv-value">
                Detail transaksi Plinks belum diketahui secara publik di repo ini
              </span>
            </div>
            <div className="kv">
              <span className="kv-label">Recommended next input</span>
              <span className="kv-value">
                Contract address, ABI/method, atau network call Plinks yang mau diotomasi
              </span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
