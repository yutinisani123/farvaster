"use client";

import { useMemo, useState } from "react";
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

type PlinksReserveResponse = {
  success: boolean;
  pack: {
    id: string;
    packTypeId: string;
    status: string;
    reservedBy: string;
    reservedAt: string;
  };
};

type PlinksStartResponse = {
  gameState: {
    id: string;
    status: string;
    dropIndex: number;
    totalDrops: number;
    boardCoins: number[];
    prizes: Array<{
      coinIndex: number;
      quantity: number;
      type: string;
    }>;
    coins: Array<{
      symbol: string;
      image: string;
      currentPrice: number;
    }>;
    randomizer: string;
    centerSlotType: string;
  };
};

type PlinksDropResponse = {
  gameState: PlinksStartResponse["gameState"];
  signature: string;
  transactionData: `0x${string}`;
  totalValue: number;
  points: number;
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

export function AutomationDashboard() {
  const [accounts, setAccounts] = useState<ImportedAccount[]>([]);
  const [sessionMessage, setSessionMessage] = useState(
    "Session-only mode aktif. Akun hanya hidup selama tab ini terbuka.",
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

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  function addLog(message: string) {
    setPlinksLog((current) => [message, ...current].slice(0, 10));
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

  async function runPlinksFlow() {
    if (!selectedAccount) {
      throw new Error("Pilih akun dulu.");
    }

    const account = getActiveAccount();
    const walletAddress = account.address;
    const authToken = selectedAccount.secret.trim();

    addLog("1. Reserving free pack...");
    const reserveResponse = await fetch("https://plinks.app/api/packs/reserve/free", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!reserveResponse.ok) {
      throw new Error("Reserve free pack gagal. Periksa token/session Plinks.");
    }

    const reserve = (await reserveResponse.json()) as PlinksReserveResponse;
    const packId = reserve.pack.id;
    addLog(`Reserved pack ${packId}`);

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

    addLog("2. Sending tx1 claimFreePack...");
    const tx1Hash = await walletClient.sendTransaction({
      account,
      chain: undefined,
      to: plinksContract,
      data: tx1Data,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx1Hash });
    addLog(`Tx1 confirmed: ${tx1Hash}`);

    addLog("3. Starting game state...");
    const startResponse = await fetch(`https://plinks.app/api/game/${packId}/start`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!startResponse.ok) {
      throw new Error("Game start gagal.");
    }

    await startResponse.json() as PlinksStartResponse;

    addLog("4. Dropping game...");
    const dropResponse = await fetch(`https://plinks.app/api/game/${packId}/drop`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!dropResponse.ok) {
      throw new Error("Game drop gagal.");
    }

    const drop = (await dropResponse.json()) as PlinksDropResponse;
    addLog(`Reward points: ${drop.points}, estimated value: ${drop.totalValue}`);

    addLog("5. Sending tx2 reward claim...");
    const tx2Hash = await walletClient.sendTransaction({
      account,
      chain: undefined,
      to: plinksContract,
      data: drop.transactionData,
      value: 0n,
    });
    await publicClient.waitForTransactionReceipt({ hash: tx2Hash });
    addLog(`Tx2 confirmed: ${tx2Hash}`);

    setTxHash(tx2Hash);
    setToAddress(plinksContract);
    setEthValue("0");
    setCalldata(drop.transactionData);
    setTxMessage(`Plinks flow sukses. Pack ${packId} selesai diproses.`);
  }

  async function handleRunTransaction() {
    try {
      setTxStatus("running");
      setTxHash("");

      if (!rpcUrl.trim()) {
        throw new Error("RPC URL wajib diisi.");
      }

      if (moduleKey === "plinks") {
        await runPlinksFlow();
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

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">Session Multi Account | Miniapp Automation</div>
        <h1 className="title">Dashboard akun banyak untuk automation miniapp.</h1>
        <p className="lede">
          Tool ini sekarang jalan dalam session-only mode. Akun tidak disimpan
          permanen, jadi lebih aman untuk eksperimen multi-account dan workflow
          tx seperti Plinks di Base.
        </p>
      </section>

      <section className="layout-grid">
        <article className="card main-card">
          <div className="status-pill">
            <span className="dot" />
            <span>{totalAccounts} session accounts loaded</span>
          </div>

          <div className="sections">
            <section className="card info-card">
              <h2 className="card-title">Session-only accounts</h2>
              <p className="card-copy">
                Tidak ada vault password lagi. Semua akun hanya hidup selama tab
                browser ini terbuka dan akan hilang saat refresh atau close.
              </p>
              <div className="stack">
                <div className="message info">{sessionMessage}</div>
                <div className="button-row">
                  <button className="button secondary" type="button" onClick={clearSessionAccounts}>
                    Clear Session Accounts
                  </button>
                </div>
              </div>
            </section>

            <div className="grid-two">
              <section className="card info-card">
                <h2 className="card-title">Import akun</h2>
                <p className="card-copy">
                  Untuk mode Plinks saat ini, field secret dipakai sebagai
                  mnemonic/private key akun yang akan menandatangani tx.
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
                    Import Session Account
                  </button>
                  <div className="message info">{importMessage}</div>
                </div>
              </section>

              <section className="card info-card">
                <h2 className="card-title">Akun session</h2>
                <p className="card-copy">
                  Pilih akun yang ingin dipakai. Untuk mode Plinks, akun ini akan
                  mengirim tx1 dan tx2 langsung ke contract target di Base.
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
                Preset `Plinks` sekarang sudah tahu flow dua tx: reserve free
                pack, `claimFreePack(packId)`, lanjut `drop`, lalu kirim tx2
                dari `transactionData` yang diberikan backend Plinks.
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
                <div className="button-row">
                  <button className="button" type="button" onClick={handleRunTransaction}>
                    {moduleKey === "plinks" ? "Run Plinks Flow" : "Send Custom Transaction"}
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
          <h2 className="card-title">Plinks workflow</h2>
          <p className="card-copy">
            Runner ini memakai flow dua tahap yang kamu capture dari network
            Plinks. Log terbaru akan tampil di bawah untuk membantu debugging.
          </p>
          <div className="stack">
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
