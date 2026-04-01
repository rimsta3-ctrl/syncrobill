import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, FileText } from "lucide-react";
import { CONTRACT_ADDRESS } from "../constants";
import { useTranslation } from "../i18n";
import { useWallet }   from "../hooks/useWallet";
import { useShipment } from "../hooks/useShipment";
import { useSupabase } from "../hooks/useSupabase";
import WalletStatus  from "./WalletStatus";
import ContractInfo  from "./ContractInfo";
import ActionPanel   from "./ActionPanel";
import Navbar        from "./Navbar";

const formatWallet = (v = "") => (v ? `${v.slice(0, 6)}...${v.slice(-4)}` : "-");
const contractExplorerUrl = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;

const COMPLETION_MESSAGES = {
  en: "Congratulations! Your transaction has been successfully established.",
  fr: "Félicitations ! Votre transaction a été établie avec succès.",
  de: "Glückwunsch! Ihre Transaktion wurde erfolgreich abgeschlossen.",
  it: "Congratulazioni! La tua transazione è stata conclusa con successo.",
  es: "¡Felicidades! Su transacción se ha completado con éxito.",
  ar: "تهانينا! تم إتمام معاملتك بنجاح.",
};

const getPriority = (tx, t) => {
  if (tx.status === "Released")  return t("terminal.priority.none");
  if (tx.status === "Validated") return "AI approved";
  if (!tx.bl_hash)               return t("terminal.priority.actionRequired");
  return t("terminal.priority.readyForWithdrawal");
};

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = (type, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((cur) => [...cur, { id, type, text }].slice(-4));
    window.setTimeout(
      () => setToasts((cur) => cur.filter((t) => t.id !== id)),
      4500
    );
  };
  return { toasts, add };
}

function Terminal() {
  const navigate     = useNavigate();
  const { t, i18n } = useTranslation();
  const { toasts, add: addToast } = useToasts();

  const [sellerAddress, setSellerAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [blFile,        setBlFile]        = useState(null);
  const [withdrawId,    setWithdrawId]    = useState("");

  // ── hook: wallet ──────────────────────────────────────────────
  const wallet = useWallet();

  // ── hook: supabase ────────────────────────────────────────────
  const db = useSupabase({ account: wallet.account });

  // ── stable refs pour les callbacks Supabase ──────────────────
  const onDepositSuccessRef  = useRef(null);
  const onBLSuccessRef       = useRef(null);
  const onWithdrawSuccessRef = useRef(null);

  onDepositSuccessRef.current = async (payload) => {
    addToast("info", t("terminal.messages.syncingDatabase"));
    try {
      await db.recordDeposit(payload);
    } catch (err) {
      addToast("error", "On-chain deposit succeeded but database sync failed. Refresh to see it in history.");
      console.error("recordDeposit failed:", err);
    }
    setDepositAmount("");
    setWithdrawId(payload.shipmentId);
    await wallet.refreshBalance();
  };

  onBLSuccessRef.current = async (payload) => {
    addToast("info", t("terminal.messages.syncingDatabase"));
    await db.recordBLSubmission(payload);
    setBlFile(null);
    setWithdrawId(payload.shipmentId);
  };

  onWithdrawSuccessRef.current = async (payload) => {
    addToast("info", t("terminal.messages.syncingDatabase"));
    await db.recordWithdrawal(payload);
    await wallet.refreshBalance();
  };

  // ── hook: shipment ────────────────────────────────────────────
  const shipmentHook = useShipment({
    provider:  wallet.provider,
    signer:    wallet.signer,
    networkOk: wallet.networkOk,
    account:   wallet.account,
    onDepositSuccess:  (p) => onDepositSuccessRef.current?.(p),
    onBLSuccess:       (p) => onBLSuccessRef.current?.(p),
    onWithdrawSuccess: (p) => onWithdrawSuccessRef.current?.(p),
  });

  const shipmentRefRef = useRef(shipmentHook.refresh);
  shipmentRefRef.current = shipmentHook.refresh;
  wallet.setOnNetworkChange(() => shipmentRefRef.current());

  // ── refresh au connect ────────────────────────────────────────
  useEffect(() => {
    if (!wallet.provider || !wallet.signer) return;
    shipmentHook.refresh();
  }, [wallet.provider, wallet.signer, wallet.account]);

  // ── polling — STOPPED while any action is pending ────────────
  // The polling calls refresh() which interacts with the contract.
  // If it runs during AI validation or blockchain signing it can
  // interfere with MetaMask and trigger unexpected popups.
  useEffect(() => {
    if (!wallet.provider || !wallet.signer || !wallet.account) return;

    const intervalId = window.setInterval(() => {
      // FIX: never poll while a tx/validation is in flight
      if (shipmentHook.pendingAction) return;
      shipmentHook.refresh();
      db.fetchTransactions();
    }, 8000); // also increased to 8s to reduce noise

    return () => window.clearInterval(intervalId);
  }, [wallet.provider, wallet.signer, wallet.account]);

  // ── toasts liés aux messages des hooks ───────────────────────
  useEffect(() => {
    if (shipmentHook.message) addToast("success", shipmentHook.message);
  }, [shipmentHook.message]);

  useEffect(() => {
    if (shipmentHook.error) addToast("error", shipmentHook.error);
  }, [shipmentHook.error]);

  useEffect(() => {
    if (wallet.error) addToast("error", wallet.error);
  }, [wallet.error]);

  // ── connexion wallet ──────────────────────────────────────────
  const handleConnect = async () => {
    const ok = await wallet.connect();
    if (ok) {
      addToast("success", t("terminal.messages.connected"));
    }
  };

  // ── refresh historique quand langue change ────────────────────
  useEffect(() => { db.fetchTransactions(); }, [i18n.language]);

  // ── valeurs dérivées ──────────────────────────────────────────
  const {
    id: currentShipmentId, status, blHash,
    isValidatedByAI, depositedAmount, seller: shipmentSeller,
  } = shipmentHook.shipment;

  // ── auto-refresh when current shipment ID changes ─────────────
  useEffect(() => {
    if (!currentShipmentId) return;

    const refreshAll = async () => {
      await shipmentHook.refresh(currentShipmentId);
      await db.fetchTransactions();
    };

    refreshAll().catch(() => {});
  }, [currentShipmentId, shipmentHook.refresh, db.fetchTransactions]);

  const completionMessage =
    COMPLETION_MESSAGES[i18n.language] || COMPLETION_MESSAGES.en;

  const isDismissed =
    localStorage.getItem(`syncrobill_closed_${currentShipmentId}`) === "true";

  const shouldShowCompletionPopup =
    Number(status) === 2 &&
    !shipmentHook.forceClosedStep &&
    !isDismissed &&
    shipmentHook.showCompletionPopup;

  // isSeller is undefined while loading to avoid flashing the warning
  const isSeller = shipmentHook.loadingContract
    ? undefined
    : Boolean(currentShipmentId) &&
      Boolean(wallet.account) &&
      Boolean(shipmentSeller) &&
      wallet.account.toLowerCase() === shipmentSeller;

  const canWithdraw = isValidatedByAI && Number(shipmentHook.escrowBalance) > 0;

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="terminal">
      {shouldShowCompletionPopup && (
        <div
          className="completion-popup-overlay"
          style={{
            position: "fixed", inset: 0, zIndex: 999999,
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.85)",
          }}
        >
          <div className="completion-popup card">
            <div className="completion-popup-icon" aria-hidden="true">✓</div>
            <h3>{completionMessage}</h3>
            <p className="completion-popup-message">
              The withdrawal has been confirmed and the shipment is ready to close.
            </p>
            <button
              className="btn primary completion-popup-button"
              onClick={shipmentHook.handleCompletionPopupClose}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <Navbar showBack onBack={() => navigate("/")} />
      <h2>{t("terminal.title")}</h2>

      <div className="app-container">
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item ${toast.type}`}>
              {toast.text}
            </div>
          ))}
        </div>

        {!wallet.networkOk && wallet.account && (
          <div className="network-alert card">
            {t("terminal.errors.wrongNetwork")}
          </div>
        )}

        <div className="message-bar">
          {shipmentHook.message && (
            <span className="success">{shipmentHook.message}</span>
          )}
          {(shipmentHook.error || wallet.error) && (
            <span className="error">{shipmentHook.error || wallet.error}</span>
          )}
        </div>

        <WalletStatus
          address={wallet.account}
          balance={wallet.balance}
          networkOk={wallet.networkOk}
          onConnect={handleConnect}
          error={wallet.error}
        />

        <ContractInfo
          shipmentId={currentShipmentId}
          account={wallet.account}
          status={status}
          escrowBalance={shipmentHook.escrowBalance}
          depositedAmount={depositedAmount}
          blHash={blHash}
          isValidatedByAI={Boolean(isValidatedByAI || blHash)}
          forceClosed={Boolean(
            shipmentHook.forceClosedStep && currentShipmentId && wallet.account
          )}
          loading={shipmentHook.loadingContract}
        />

        <ActionPanel
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          sellerAddress={sellerAddress}
          setSellerAddress={setSellerAddress}
          blFile={blFile}
          onBLFileChange={(e) => setBlFile(e.target.files?.[0] || null)}
          withdrawId={withdrawId}
          setWithdrawId={setWithdrawId}
          currentShipmentId={currentShipmentId}
          status={status}
          isValidatedByAI={Boolean(isValidatedByAI)}
          onDeposit={() => shipmentHook.deposit({ sellerAddress, depositAmount })}
          onSubmitBL={() => shipmentHook.submitBL({ blFile, currentShipmentId })}
          onWithdraw={() => shipmentHook.withdraw({ withdrawId })}
          canWithdraw={canWithdraw}
          withdrawLocked={shipmentHook.withdrawLocked}
          isSeller={isSeller}
          pendingAction={shipmentHook.pendingAction}
        />

        <div className="transactions-history card">
          <h2>{t("terminal.historyTitle")}</h2>
          {db.loadingTransactions ? (
            <div className="loading">{t("terminal.loadingHistory")}</div>
          ) : db.transactions.length === 0 ? (
            <div className="empty-history">{t("terminal.noTransactions")}</div>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t("terminal.table.id")}</th>
                    <th>{t("terminal.table.buyer")}</th>
                    <th>{t("terminal.table.seller")}</th>
                    <th>{t("terminal.table.amount")}</th>
                    <th>{t("terminal.table.blHash")}</th>
                    <th>{t("terminal.table.document")}</th>
                    <th>{t("terminal.table.priority")}</th>
                    <th>{t("terminal.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {db.transactions.map((tx) => (
                    <tr key={tx.blockchain_id}>
                      <td>
                        <a
                          className="history-id-link"
                          href={contractExplorerUrl}
                          target="_blank" rel="noreferrer"
                          title={`Shipment #${tx.blockchain_id} on Etherscan`}
                          aria-label={`Shipment #${tx.blockchain_id} on Etherscan`}
                        >
                          <span>#{tx.blockchain_id}</span>
                          <ExternalLink size={14} strokeWidth={2} />
                        </a>
                      </td>
                      <td>{formatWallet(tx.buyer)}</td>
                      <td>{formatWallet(tx.seller)}</td>
                      <td>{tx.amount} ETH</td>
                      <td className="history-hash">
                        {tx.bl_hash || t("contract.notSubmitted")}
                      </td>
                      <td>
                        {tx.document_url ? (
                          <a
                            className="document-link"
                            href={tx.document_url}
                            target="_blank" rel="noreferrer"
                            title={t("terminal.document.open")}
                            aria-label={t("terminal.document.open")}
                          >
                            <FileText size={18} />
                          </a>
                        ) : (
                          <span className="document-missing">
                            {t("terminal.document.missing")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`priority-badge ${
                            !tx.bl_hash ? "required"
                            : tx.status === "Released" ? "done"
                            : "ready"
                          }`}
                        >
                          {getPriority(tx, t)}
                        </span>
                      </td>
                      <td>
                        <div className="status-cell">
                          <span
                            className={`status-badge ${
                              tx.status === "Released" ? "released"
                              : tx.status === "Validated" ? "validated"
                              : "locked"
                            }`}
                          >
                            {tx.status === "Released"
                              ? t("terminal.status.released")
                              : tx.status === "Validated"
                              ? "Validated"
                              : t("terminal.status.locked")}
                          </span>
                          <a
                            className="status-explorer-link"
                            href={contractExplorerUrl}
                            target="_blank" rel="noreferrer"
                            title="View contract on Etherscan"
                            aria-label="View contract on Etherscan"
                          >
                            <ExternalLink size={14} strokeWidth={2} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <footer className="terminal-footer">{t("terminal.footer")}</footer>
    </div>
  );
}

export default Terminal;