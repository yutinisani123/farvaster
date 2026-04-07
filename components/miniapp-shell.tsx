"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState, useTransition } from "react";

import type {
  ActionResponse,
  AuthState,
  ErrorResponse,
  MeResponse,
} from "@/lib/types";

const initialStatus = "Waiting for Farcaster context.";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while talking to Farcaster.";
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function MiniappShell() {
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [statusMessage, setStatusMessage] = useState(initialStatus);
  const [tokenPreview, setTokenPreview] = useState<string>();
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [actionResult, setActionResult] = useState<ActionResponse | null>(null);
  const [contextDebug, setContextDebug] = useState<string>("{}");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setAuthState("checking-context");
        setStatusMessage("Checking whether the app is running inside Farcaster...");

        const [miniAppFlag, context] = await Promise.all([
          sdk.isInMiniApp(),
          sdk.context.catch(() => null),
        ]);

        if (!mounted) {
          return;
        }

        setIsMiniApp(miniAppFlag);
        setContextDebug(JSON.stringify(context ?? {}, null, 2));

        if (!miniAppFlag) {
          setAuthState("unauthenticated");
          setStatusMessage(
            "Browser mode detected. Open this URL inside a Farcaster Mini App host to test Quick Auth.",
          );
          return;
        }

        setAuthState("authenticating");
        setStatusMessage("Mini App detected. Signaling ready state to the host...");
        await sdk.actions.ready();

        setStatusMessage("Requesting a Quick Auth token from Farcaster...");
        const { token } = await sdk.quickAuth.getToken();

        if (!mounted) {
          return;
        }

        setTokenPreview(`${token.slice(0, 18)}...${token.slice(-12)}`);
        setStatusMessage("Token acquired. Loading authenticated user profile...");

        const meResponse = await sdk.quickAuth.fetch("/api/me", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!meResponse.ok) {
          const errorPayload = await parseJson<ErrorResponse>(meResponse);
          throw new Error(errorPayload.error || "Unable to load profile.");
        }

        const me = await parseJson<MeResponse>(meResponse);

        if (!mounted) {
          return;
        }

        setProfile(me);
        setAuthState("authenticated");
        setStatusMessage("Authenticated with Quick Auth. Protected API is ready.");
      } catch (error) {
        if (!mounted) {
          return;
        }

        setAuthState("error");
        setStatusMessage(getErrorMessage(error));
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  function handleProtectedAction() {
    startTransition(() => {
      void (async () => {
        try {
          setStatusMessage("Calling protected backend action...");

          const response = await sdk.quickAuth.fetch("/api/action", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              source: "miniapp-ui",
            }),
          });

          if (!response.ok) {
            const payload = await parseJson<ErrorResponse>(response);
            throw new Error(payload.error || "Protected action failed.");
          }

          const payload = await parseJson<ActionResponse>(response);
          setActionResult(payload);
          setStatusMessage("Protected action completed successfully.");
        } catch (error) {
          setStatusMessage(getErrorMessage(error));
        }
      })();
    });
  }

  const statusTone =
    authState === "error"
      ? "error"
      : authState === "authenticated"
        ? "success"
        : "info";

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="eyebrow">Farcaster Mini App | Quick Auth</div>
        <h1 className="title">Login native untuk Farcaster Mini App.</h1>
        <p className="lede">
          Web tool ini mendemokan alur miniapp end-to-end: deteksi host
          Farcaster, ambil Quick Auth JWT, verifikasi di backend, lalu jalankan
          protected action dari UI.
        </p>
      </section>

      <section className="layout-grid">
        <article className="card main-card">
          <div className="status-pill">
            <span className="dot" />
            <span>{authState}</span>
          </div>

          <div className="sections">
            <div className={`message ${statusTone}`}>{statusMessage}</div>

            <div className="grid-two">
              <section className="card info-card">
                <h2 className="card-title">Session</h2>
                <p className="card-copy">
                  Frontend memakai `sdk.quickAuth.getToken()` untuk meminta JWT
                  dan `sdk.quickAuth.fetch()` untuk memanggil endpoint
                  terproteksi tanpa mengelola header secara manual.
                </p>
                <div className="stack">
                  <div className="kv">
                    <span className="kv-label">Running inside miniapp</span>
                    <span className="kv-value">{isMiniApp ? "Yes" : "No"}</span>
                  </div>
                  <div className="kv">
                    <span className="kv-label">Quick Auth token</span>
                    <span className="kv-value">{tokenPreview || "Not issued yet"}</span>
                  </div>
                </div>
              </section>

              <section className="card info-card">
                <h2 className="card-title">Authenticated user</h2>
                <p className="card-copy">
                  Backend memverifikasi JWT berdasarkan audience domain app,
                  lalu mengembalikan identitas minimum `fid` dan profile data
                  best-effort bila tersedia.
                </p>
                <div className="stack">
                  <div className="kv">
                    <span className="kv-label">FID</span>
                    <span className="kv-value">{profile?.fid ?? "Unknown"}</span>
                  </div>
                  <div className="kv">
                    <span className="kv-label">Username</span>
                    <span className="kv-value">{profile?.username || "Unavailable"}</span>
                  </div>
                  <div className="kv">
                    <span className="kv-label">Primary address</span>
                    <span className="kv-value">
                      {profile?.primaryAddress || "Unavailable"}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <section className="card action-card">
              <h2 className="card-title">Protected action demo</h2>
              <p className="card-copy">
                Tombol ini hanya berguna ketika miniapp berhasil login. Request
                akan dikirim dengan bearer token Quick Auth dan diverifikasi lagi
                di server.
              </p>
              <div className="button-row">
                <button
                  className="button"
                  type="button"
                  onClick={handleProtectedAction}
                  disabled={authState !== "authenticated" || isPending}
                >
                  {isPending ? "Running action..." : "Run Protected Action"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Reload Session
                </button>
              </div>
              <div className="stack">
                <div className={`message ${actionResult ? "success" : "info"}`}>
                  {actionResult
                    ? `${actionResult.message} at ${actionResult.requestedAt}`
                    : "Action result will appear here after a successful call."}
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="card main-card">
          <h2 className="card-title">Mini App context</h2>
          <p className="card-copy">
            Safe fallback tetap aktif di browser biasa. Saat dibuka dari host
            Farcaster, context ini membantu kita memastikan environment miniapp
            memang tersedia.
          </p>
          <pre className="code-box">{contextDebug}</pre>
          <p className="footer-note">
            Jika profile belum lengkap, app tetap dianggap berhasil selama token
            valid dan `fid` dapat diverifikasi oleh backend.
          </p>
        </aside>
      </section>
    </main>
  );
}
