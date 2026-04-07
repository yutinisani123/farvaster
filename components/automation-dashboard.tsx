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
import { encodeFunctionData } from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import {
  clearWorkspace,
  getLastLoginId,
  loadEncryptedWorkspace,
  saveEncryptedWorkspace,
  workspaceExists,
} from "@/lib/vault";

type ImportedAccount = {
  id: string;
  label: string;
  kind: "mnemonic" | "privateKey";
  secret: string;
  address: string;
  derivationIndex: number;
  importedAt: string;
};

type ModuleKey = "plinks" | "custom";
type TransactionStatus = "idle" | "running" | "success" | "error";
type LoginMode = "locked" | "ready";

type PlinksReserveResponse = {
  success?: boolean;
  pack?: {
    id?: string;
    packTypeId?: string;
    status?: string;
    reservedBy?: string;
    reservedAt?: string;
  };
};

type PlinksDropResponse = {
  signature?: string;
  transactionData?: `0x${string}`;
  totalValue?: number;
  points?: number;
  gameState?: {
    id?: string;
    status?: string;
  };
};

type WorkspaceState = {
  version: 1;
  savedAt: string;
  accounts: ImportedAccount[];
  selectedAccountId: string;
  moduleKey: ModuleKey;
  rpcUrl: string;
  toAddress: string;
  ethValue: string;
  calldata: string;
  txHash: string;
  txStatus: TransactionStatus;
  txMessage: string;
  plinksLog: string[];
  plinksBearer: string;
  plinksReserveJson: string;
  plinksDropJson: string;
  plinksPackId: string;
  plinksTx1Hash: string;
  plinksTx2Hash: string;
};

const defaultRpc = "https://mainnet.base.org";
const plinksContract = "0x31505c6102e5945eDDf0bD04E8330ab99796adC1" as const;
const plinksAbi = [
  {
    type: "function",
    name: "claimFreePack",
    stateMutability: "nonpayable",
    inputs: [{ name: "packId", type: "string" }],
    outputs: [],
  },
] as const;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

function maskAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getJsonPasteHint(value: string, kind: "reserve" | "drop") {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("http")) {
    return `Paste isi Response JSON ${kind}, bukan URL/path request.`;
  }

  return "";
}

export function AutomationDashboard() {
  const [loginMode, setLoginMode] = useState<LoginMode>("locked");
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState(
    "Buat login ID + password lokal untuk menyimpan session dan field workflow setelah refresh.",
  );
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [sessionMessage, setSessionMessage] = useState(
    "Workspace terenkripsi siap. Data akan tetap ada setelah refresh.",
  );
  const [label, setLabel] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [secretType, setSecretType] = useState<ImportedAccount["kind"]>("mnemonic");
  const [derivationIndex, setDerivationIndex] = useState("0");
  const [importMessage, setImportMessage] = useState(
    "Impor mnemonic atau private key. Data tidak disimpan ke local storage.",
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [moduleKey, setModuleKey] = useState<ModuleKey>("plinks");
  const [rpcUrl, setRpcUrl] = useState(defaultRpc);
  const [toAddress, setToAddress] = useState<string>(plinksContract);
  const [ethValue, setEthValue] = useState("0");
  const [calldata, setCalldata] = useState("0x");
  const [txHash, setTxHash] = useState("");
  const [txStatus, setTxStatus] = useState<TransactionStatus>("idle");
  const [txMessage, setTxMessage] = useState(
    "Preset Plinks siap. Kamu juga bisa pakai mode custom untuk tx EVM lain.",
  );
  const [plinksLog, setPlinksLog] = useState<string[]>([]);
  const [plinksBearer, setPlinksBearer] = useState("");
  const [plinksReserveJson, setPlinksReserveJson] = useState("");
  const [plinksDropJson, setPlinksDropJson] = useState("");
  const [plinksPackId, setPlinksPackId] = useState("");
  const [plinksTx1Hash, setPlinksTx1Hash] = useState("");
  const [plinksTx2Hash, setPlinksTx2Hash] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );
  const reserveJsonHint = getJsonPasteHint(plinksReserveJson, "reserve");
  const dropJsonHint = getJsonPasteHint(plinksDropJson, "drop");
  const canSendTx1 = Boolean(selectedAccountId && plinksPackId.trim());
  const canLoadTx2 = Boolean(plinksDropJson.trim()) && !dropJsonHint;
  const canSendTx2 = Boolean(selectedAccountId && calldata.trim() !== "0x" && canLoadTx2);

  useEffect(() => {
    const lastLoginId = getLastLoginId();

    if (lastLoginId) {
      setLoginId(lastLoginId);
      setLoginMessage(`Workspace terakhir terdeteksi untuk ID "${lastLoginId}".`);
    }
  }, []);

  useEffect(() => {
    if (loginMode !== "ready" || !loginId.trim() || !loginPassword.trim()) {
      return;
    }

    const workspace: WorkspaceState = {
      version: 1,
      savedAt: new Date().toISOString(),
      accounts,
      selectedAccountId,
      moduleKey,
      rpcUrl,
      toAddress,
      ethValue,
      calldata,
      txHash,
      txStatus,
      txMessage,
      plinksLog,
      plinksBearer,
      plinksReserveJson,
      plinksDropJson,
      plinksPackId,
      plinksTx1Hash,
      plinksTx2Hash,
    };

    void saveEncryptedWorkspace(loginId.trim(), loginPassword, workspace);
  }, [
    accounts,
    calldata,
    ethValue,
    loginId,
    loginMode,
    loginPassword,
    moduleKey,
    plinksBearer,
    plinksDropJson,
    plinksLog,
    plinksPackId,
    plinksReserveJson,
    plinksTx1Hash,
    plinksTx2Hash,
    rpcUrl,
    selectedAccountId,
    toAddress,
    txHash,
    txMessage,
    txStatus,
  ]);

  function addLog(message: string) {
    setPlinksLog((current) => [message, ...current].slice(0, 10));
  }

  async function handleWorkspaceLogin() {
    try {
      if (!loginId.trim()) {
        throw new Error("Isi login ID dulu.");
      }

      if (!loginPassword.trim()) {
        throw new Error("Isi password dulu.");
      }

      const exists = workspaceExists(loginId.trim());

      if (!exists) {
        const freshWorkspace: WorkspaceState = {
          version: 1,
          savedAt: new Date().toISOString(),
          accounts: [],
          selectedAccountId: "",
          moduleKey: "plinks",
          rpcUrl: defaultRpc,
          toAddress: plinksContract,
          ethValue: "0",
          calldata: "0x",
          txHash: "",
          txStatus: "idle",
          txMessage: "Workspace baru dibuat. Semua perubahan akan autosave.",
          plinksLog: [],
          plinksBearer: "",
          plinksReserveJson: "",
          plinksDropJson: "",
          plinksPackId: "",
          plinksTx1Hash: "",
          plinksTx2Hash: "",
        };

        await saveEncryptedWorkspace(loginId.trim(), loginPassword, freshWorkspace);
        setLoginMessage(`Workspace baru dibuat untuk ID "${loginId.trim()}".`);
      }

      const workspace = await loadEncryptedWorkspace<WorkspaceState>(loginId.trim(), loginPassword);

      if (!workspace) {
        throw new Error("Workspace tidak ditemukan.");
      }

      setAccounts(workspace.accounts);
      setSelectedAccountId(workspace.selectedAccountId);
      setModuleKey(workspace.moduleKey);
      setRpcUrl(workspace.rpcUrl);
      setToAddress(workspace.toAddress);
      setEthValue(workspace.ethValue);
      setCalldata(workspace.calldata);
      setTxHash(workspace.txHash);
      setTxStatus(workspace.txStatus);
      setTxMessage(workspace.txMessage);
      setPlinksLog(workspace.plinksLog);
      setPlinksBearer(workspace.plinksBearer);
      setPlinksReserveJson(workspace.plinksReserveJson);
      setPlinksDropJson(workspace.plinksDropJson);
      setPlinksPackId(workspace.plinksPackId);
      setPlinksTx1Hash(workspace.plinksTx1Hash);
      setPlinksTx2Hash(workspace.plinksTx2Hash);
      setLoginMode("ready");
      setSessionMessage("Workspace terbuka. Semua input akan autosave setelah refresh.");
    } catch (error) {
      setLoginMessage(getErrorMessage(error));
    }
  }

  function handleWorkspaceLogout() {
    setLoginMode("locked");
    setLoginPassword("");
    setLoginMessage("Workspace dikunci. Buka lagi dengan login ID dan password yang sama.");
  }

  function handleClearSavedWorkspace() {
    if (!loginId.trim()) {
      setLoginMessage("Isi login ID dulu sebelum menghapus workspace.");
      return;
    }

    clearWorkspace(loginId.trim());
    setAccounts([]);
    setSelectedAccountId("");
    setModuleKey("plinks");
    setRpcUrl(defaultRpc);
    setToAddress(plinksContract);
    setEthValue("0");
    setCalldata("0x");
    setTxHash("");
    setTxStatus("idle");
    setTxMessage("Workspace dihapus. Buka lagi untuk mulai dari kosong.");
    setPlinksLog([]);
    setPlinksBearer("");
    setPlinksReserveJson("");
    setPlinksDropJson("");
    setPlinksPackId("");
    setPlinksTx1Hash("");
    setPlinksTx2Hash("");
    setLoginMode("locked");
    setLoginPassword("");
    setLoginMessage(`Workspace untuk ID "${loginId.trim()}" sudah dihapus.`);
  }

  function deriveAddress(kind: ImportedAccount["kind"], secret: string, index: number) {
    if (kind === "mnemonic") {
      return mnemonicToAccount(secret.trim(), {
        addressIndex: index,
      }).address;
    }

    return privateKeyToAccount(secret.trim() as `0x${string}`).address;
  }

  function getActiveAccount() {
    if (!selectedAccount) {
      throw new Error("Pilih akun dulu.");
    }

    return selectedAccount.kind === "mnemonic"
      ? mnemonicToAccount(selectedAccount.secret, {
          addressIndex: selectedAccount.derivationIndex,
        })
      : privateKeyToAccount(selectedAccount.secret as `0x${string}`);
  }

  async function handleImportAccount() {
    try {
      const index = Number(derivationIndex);

      if (!Number.isInteger(index) || index < 0) {
        throw new Error("Derivation index harus angka 0 atau lebih.");
      }

      if (!secretValue.trim()) {
        throw new Error("Isi mnemonic atau private key.");
      }

      const address = deriveAddress(secretType, secretValue, index);
      const nextAccount: ImportedAccount = {
        id: crypto.randomUUID(),
        label: label.trim() || `Account ${accounts.length + 1}`,
        kind: secretType,
        secret: secretValue.trim(),
        address,
        derivationIndex: secretType === "mnemonic" ? index : 0,
        importedAt: new Date().toISOString(),
      };

      setAccounts((current) => [...current, nextAccount]);
      setSelectedAccountId(nextAccount.id);
      setSecretValue("");
      setLabel("");
      setDerivationIndex("0");
      setSessionMessage(
        "Akun tersimpan hanya di memori tab ini. Refresh browser akan menghapus semua akun.",
      );
      setImportMessage(`Akun ${nextAccount.label} siap dipakai di session ini.`);
    } catch (error) {
      setImportMessage(getErrorMessage(error));
    }
  }

  function clearSessionAccounts() {
    setAccounts([]);
    setSelectedAccountId("");
    setSessionMessage("Semua akun session dibersihkan dari memori tab ini.");
  }

  function parseReserveJson() {
    if (reserveJsonHint) {
      throw new Error(reserveJsonHint);
    }

    const parsed = JSON.parse(plinksReserveJson) as PlinksReserveResponse;
    const packId = parsed.pack?.id;

    if (!packId) {
      throw new Error("Reserve JSON tidak mengandung pack.id.");
    }

    setPlinksPackId(packId);
    addLog(`Pack ID terdeteksi: ${packId}`);
    return packId;
  }

  function parseDropJson() {
    if (dropJsonHint) {
      throw new Error(dropJsonHint);
    }

    const parsed = JSON.parse(plinksDropJson) as PlinksDropResponse;

    if (!parsed.transactionData || !/^0x[0-9a-fA-F]+$/.test(parsed.transactionData)) {
      throw new Error("Drop JSON tidak mengandung transactionData yang valid.");
    }

    setCalldata(parsed.transactionData);
    addLog("transactionData tx2 berhasil dimuat dari drop JSON.");
    return parsed;
  }

  async function runCustomTransaction() {
    const account = getActiveAccount();

    if (!isAddress(toAddress)) {
      throw new Error("Alamat tujuan tx tidak valid.");
    }

    if (!rpcUrl.trim()) {
      throw new Error("RPC URL wajib diisi.");
    }

    if (!/^0x[0-9a-fA-F]*$/.test(calldata.trim())) {
      throw new Error("Calldata harus hex string berawalan 0x.");
    }

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

    await publicClient.waitForTransactionReceipt({ hash });

    setTxHash(hash);
    setTxMessage(`Custom tx sukses untuk ${selectedAccount?.label}.`);
  }

  async function sendPlinksTx1() {
    const account = getActiveAccount();
    const packId = plinksPackId || parseReserveJson();
    const walletClient = createWalletClient({
      account,
      chain: undefined,
      transport: http(rpcUrl.trim()),
    });
    const publicClient = createPublicClient({
      transport: http(rpcUrl.trim()),
    });
    const tx1Data = encodeFunctionData({
      abi: plinksAbi,
      functionName: "claimFreePack",
      args: [packId],
    });
    addLog("Mengirim tx1 claimFreePack...");
    const hash = await walletClient.sendTransaction({
      account,
      chain: undefined,
      to: plinksContract,
      data: tx1Data,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    setPlinksTx1Hash(hash);
    addLog(`Tx1 confirmed: ${hash}`);
    return hash;
  }

  async function sendPlinksTx2() {
    const account = getActiveAccount();
    const drop = parseDropJson();
    const walletClient = createWalletClient({
      account,
      chain: undefined,
      transport: http(rpcUrl.trim()),
    });
    const publicClient = createPublicClient({
      transport: http(rpcUrl.trim()),
    });
    addLog("Mengirim tx2 reward claim...");
    const hash = await walletClient.sendTransaction({
      account,
      chain: undefined,
      to: plinksContract,
      data: drop.transactionData,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    setPlinksTx2Hash(hash);
    setTxHash(hash);
    setToAddress(plinksContract);
    setEthValue("0");
    setTxMessage(`Tx2 sukses untuk pack ${plinksPackId || drop.gameState?.id || "unknown"}.`);
    addLog(`Tx2 confirmed: ${hash}`);
    return hash;
  }

  async function handleReservePackId() {
    try {
      setTxStatus("idle");
      const packId = parseReserveJson();
      setTxMessage(`Pack ID siap: ${packId}`);
    } catch (error) {
      setTxStatus("error");
      setTxMessage(getErrorMessage(error));
      addLog(getErrorMessage(error));
    }
  }

  async function handleLoadTx2Data() {
    try {
      setTxStatus("idle");
      const drop = parseDropJson();
      setTxMessage(
        `Tx2 payload siap. Points: ${drop.points ?? "-"}, estimated value: ${drop.totalValue ?? "-"}`,
      );
    } catch (error) {
      setTxStatus("error");
      setTxMessage(getErrorMessage(error));
      addLog(getErrorMessage(error));
    }
  }

  async function handlePlinksStep(action: "tx1" | "tx2" | "full") {
    try {
      setTxStatus("running");
      setTxHash("");

      if (!rpcUrl.trim()) {
        throw new Error("RPC URL wajib diisi.");
      }

      if (action === "tx1") {
        const hash = await sendPlinksTx1();
        setTxHash(hash);
        setTxMessage("Tx1 sukses. Lanjutkan game manual di Plinks lalu ambil drop JSON untuk tx2.");
      } else if (action === "tx2") {
        const hash = await sendPlinksTx2();
        setTxHash(hash);
      } else {
        const tx1Hash = await sendPlinksTx1();
        const tx2Hash = await sendPlinksTx2();
        setTxHash(tx2Hash);
        setTxMessage(`Flow manual-complete sukses. Tx1: ${tx1Hash}, Tx2: ${tx2Hash}`);
      }

      setTxStatus("success");
    } catch (error) {
      setTxStatus("error");
      setTxMessage(getErrorMessage(error));
      addLog(getErrorMessage(error));
    }
  }

  async function handleRunTransaction() {
    try {
      setTxStatus("running");
      setTxHash("");

      if (!rpcUrl.trim()) {
        throw new Error("RPC URL wajib diisi.");
      }

      if (moduleKey === "plinks") {
        throw new Error("Untuk module Plinks, jalankan step per step di panel workflow.");
      } else {
        await runCustomTransaction();
      }

      setTxStatus("success");
    } catch (error) {
      setTxStatus("error");
      setTxMessage(getErrorMessage(error));
      addLog(getErrorMessage(error));
    }
  }

  const totalAccounts = accounts.length;

  if (loginMode === "locked") {
    return (
      <main className="page-shell">
        <section className="hero">
          <div className="eyebrow">Local Workspace Login</div>
          <h1 className="title">Buka workspace tersimpan untuk automation.</h1>
          <p className="lede">
            Login ini hanya lokal di browser kamu. Gunanya untuk menyimpan akun, field JSON,
            pack ID, dan progress step Plinks agar tidak hilang saat refresh.
          </p>
        </section>

        <section className="layout-grid">
          <article className="card main-card">
            <div className="sections">
              <section className="card info-card">
                <h2 className="card-title">Login Workspace</h2>
                <p className="card-copy">
                  Kalau login ID belum pernah dipakai, app akan membuat workspace baru.
                  Kalau sudah ada, password yang sama akan membuka data tersimpan.
                </p>
                <div className="stack">
                  <div className="kv">
                    <span className="kv-label">Login ID</span>
                    <input
                      className="field"
                      value={loginId}
                      onChange={(event) => setLoginId(event.target.value)}
                      placeholder="Contoh: yutini-main"
                    />
                  </div>
                  <div className="kv">
                    <span className="kv-label">Password</span>
                    <input
                      className="field"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Buat password lokal"
                    />
                  </div>
                  <div className="button-row">
                    <button className="button" type="button" onClick={handleWorkspaceLogin}>
                      Open Workspace
                    </button>
                  </div>
                  <div className="message info">{loginMessage}</div>
                </div>
              </section>
            </div>
          </article>

          <aside className="card main-card">
            <h2 className="card-title">Catatan</h2>
            <p className="card-copy">
              Password ini bukan password Farcaster. Ini hanya kunci lokal untuk
              mengenkripsi workspace di browser yang sama.
            </p>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">Saved Workspace | Miniapp Automation</div>
        <h1 className="title">Dashboard akun banyak untuk automation miniapp.</h1>
        <p className="lede">
          Workspace kamu sekarang autosave. Jadi akun, pack ID, JSON reserve/drop,
          dan step workflow tidak akan hilang saat halaman direfresh.
        </p>
      </section>

      <section className="layout-grid">
        <article className="card main-card">
          <div className="status-pill">
            <span className="dot" />
            <span>{totalAccounts} saved accounts loaded</span>
          </div>

          <div className="sections">
            <section className="card info-card">
              <h2 className="card-title">Workspace session</h2>
              <p className="card-copy">
                Semua perubahan di halaman ini otomatis disimpan ke browser ini dengan login ID yang sedang terbuka.
              </p>
              <div className="stack">
                <div className="message info">{sessionMessage}</div>
                <div className="button-row">
                  <button className="button secondary" type="button" onClick={handleWorkspaceLogout}>
                    Lock Workspace
                  </button>
                  <button className="button secondary" type="button" onClick={handleClearSavedWorkspace}>
                    Delete Workspace
                  </button>
                  <button className="button secondary" type="button" onClick={clearSessionAccounts}>
                    Clear Accounts
                  </button>
                </div>
              </div>
            </section>

            <div className="grid-two">
              <section className="card info-card">
                <h2 className="card-title">Import akun</h2>
                <p className="card-copy">
                  Mnemonic/private key yang kamu isi akan ikut tersimpan di workspace terenkripsi lokal ini.
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
                      onChange={(event) => setSecretType(event.target.value as ImportedAccount["kind"])}
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
                    Import Saved Account
                  </button>
                  <div className="message info">{importMessage}</div>
                </div>
              </section>

              <section className="card info-card">
                <h2 className="card-title">Akun tersimpan</h2>
                <p className="card-copy">
                  Pilih akun yang ingin dipakai. Setelah refresh, pilihan ini tetap tersimpan.
                </p>
                <div className="stack">
                  <select
                    className="field"
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                  >
                    <option value="">Pilih akun</option>
                    {accounts.map((item) => (
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
                Plinks sekarang dipisah per langkah dan semua input akan tetap ada setelah refresh.
              </p>
              <div className="stack">
                <div className="kv">
                  <span className="kv-label">Module</span>
                  <select
                    className="field"
                    value={moduleKey}
                    onChange={(event) => setModuleKey(event.target.value as ModuleKey)}
                  >
                    <option value="plinks">Plinks free pack runner</option>
                    <option value="custom">Custom EVM transaction</option>
                  </select>
                </div>
                {moduleKey === "plinks" ? (
                  <>
                    <div className="kv">
                      <span className="kv-label">Plinks bearer token (opsional catatan)</span>
                      <input
                        className="field"
                        value={plinksBearer}
                        onChange={(event) => setPlinksBearer(event.target.value)}
                        placeholder="Simpan catatan token/session di workspace"
                      />
                    </div>
                    <div className="kv">
                      <span className="kv-label">Step 1 input: reserve response JSON</span>
                      <textarea
                        className="field field-area"
                        value={plinksReserveJson}
                        onChange={(event) => setPlinksReserveJson(event.target.value)}
                        placeholder='Paste response JSON dari /api/packs/reserve/free'
                      />
                    </div>
                    {reserveJsonHint ? <div className="message error">{reserveJsonHint}</div> : null}
                    <div className="button-row">
                      <button className="button secondary" type="button" onClick={handleReservePackId}>
                        Parse Pack ID
                      </button>
                      <button
                        className="button"
                        type="button"
                        disabled={!canSendTx1}
                        onClick={() => void handlePlinksStep("tx1")}
                      >
                        Send Tx1
                      </button>
                    </div>
                    <div className="kv">
                      <span className="kv-label">Detected pack ID</span>
                      <span className="kv-value">{plinksPackId || "Belum ada pack ID"}</span>
                    </div>
                    <div className="kv">
                      <span className="kv-label">Tx1 hash</span>
                      <span className="kv-value">{plinksTx1Hash || "Belum ada tx1"}</span>
                    </div>
                    <div className="kv">
                      <span className="kv-label">Step 2 input: drop response JSON</span>
                      <textarea
                        className="field field-area"
                        value={plinksDropJson}
                        onChange={(event) => setPlinksDropJson(event.target.value)}
                        placeholder='Paste response JSON dari /api/game/.../drop'
                      />
                    </div>
                    {dropJsonHint ? <div className="message error">{dropJsonHint}</div> : null}
                    <div className="button-row">
                      <button className="button secondary" type="button" onClick={handleLoadTx2Data}>
                        Load Tx2 Payload
                      </button>
                      <button
                        className="button"
                        type="button"
                        disabled={!canSendTx2}
                        onClick={() => void handlePlinksStep("tx2")}
                      >
                        Send Tx2
                      </button>
                    </div>
                    <div className="kv">
                      <span className="kv-label">Tx2 hash</span>
                      <span className="kv-value">{plinksTx2Hash || "Belum ada tx2"}</span>
                    </div>
                  </>
                ) : null}
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
                    <span className="kv-label">Target contract</span>
                    <input
                      className="field"
                      value={toAddress}
                      onChange={(event) => setToAddress(event.target.value)}
                      placeholder="0x..."
                    />
                  </div>
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
                  <span className="kv-label">Calldata / latest tx2 payload</span>
                  <textarea
                    className="field field-area"
                    value={calldata}
                    onChange={(event) => setCalldata(event.target.value)}
                    placeholder="0x"
                  />
                </div>
                {moduleKey === "custom" ? (
                  <div className="button-row">
                    <button className="button" type="button" onClick={handleRunTransaction}>
                      Send Custom Transaction
                    </button>
                  </div>
                ) : null}
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
          <h2 className="card-title">Plinks workflow</h2>
          <p className="card-copy">
            Workflow Plinks sekarang dipisah: parse reserve response, kirim tx1,
            paste drop response, lalu kirim tx2. Workspace ini autosave sehingga
            kamu tidak perlu isi ulang semua field setelah refresh.
          </p>
          <div className="stack">
            <div className="kv">
              <span className="kv-label">Workspace ID</span>
              <span className="kv-value">{loginId || "Unknown"}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Preset contract</span>
              <span className="kv-value">{plinksContract}</span>
            </div>
            <div className="kv">
              <span className="kv-label">Observed endpoints</span>
              <span className="kv-value">
                reserve/free {"->"} game/start {"->"} game/drop {"->"} signed tx2
              </span>
            </div>
            <div className="kv">
              <span className="kv-label">Recent log</span>
              <span className="kv-value">
                {plinksLog.length ? plinksLog.join(" | ") : "Belum ada run"}
              </span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
