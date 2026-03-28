import React from "react";
import { useTranslation } from "../i18n";

export default function ActionPanel({
  depositAmount,
  setDepositAmount,
  sellerAddress,
  setSellerAddress,
  blFile,
  onBLFileChange,
  withdrawId,
  setWithdrawId,
  onDeposit,
  onSubmitBL,
  onWithdraw,
  canWithdraw,
  pendingAction,
}) {
  const { t } = useTranslation();
  const isPending = pendingAction.length > 0;
  const isDepositing = pendingAction === "deposit";
  const isSubmittingBL = pendingAction === "submitBL" || pendingAction === "aiValidation" || pendingAction === "blockchainSignature";
  const isWithdrawing = pendingAction === "withdraw";
  const submitLabel =
    pendingAction === "aiValidation"
      ? "Analyse IA en cours..."
      : pendingAction === "blockchainSignature"
        ? "Signature Blockchain..."
        : t("actions.uploading");

  return (
    <div className="action-panel card">
      <h2>{t("actions.center")}</h2>
      <div className="sections">
        <div className="section">
          <h3>{t("actions.importer")}</h3>
          <label>
            {t("actions.sellerAddress")}
            <input
              type="text"
              value={sellerAddress}
              onChange={(e) => setSellerAddress(e.target.value)}
              placeholder="0x..."
            />
          </label>
          <label>
            {t("actions.amountEth")}
            <input
              type="number"
              value={depositAmount}
              min="0"
              step="0.01"
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </label>
          <button onClick={onDeposit} disabled={isPending} className="btn primary">
            {isDepositing ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                {t("ui.loading")}
              </span>
            ) : (
              t("actions.depositFunds")
            )}
          </button>
        </div>
        <div className="section">
          <h3>{t("actions.exporter")}</h3>
          <label className="file-upload">
            <span>{t("actions.uploadPdf")}</span>
            <input type="file" accept="application/pdf,.pdf" onChange={onBLFileChange} />
          </label>
          <div className="file-upload-meta">
            <strong>{t("actions.selectedFile")}:</strong> {blFile?.name || t("actions.noFileSelected")}
          </div>
          <div className="file-upload-hint">{t("actions.uploadHint")}</div>
          <button onClick={onSubmitBL} disabled={isPending} className="btn primary">
            {isSubmittingBL ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                {submitLabel}
              </span>
            ) : (
              t("actions.uploadAndSubmit")
            )}
          </button>

          <label style={{ marginTop: "16px", display: "block" }}>
            {t("actions.shipmentIdWithdraw")}
            <input
              type="number"
              min="1"
              value={withdrawId}
              onChange={(e) => setWithdrawId(e.target.value)}
            />
          </label>

          <button
            onClick={onWithdraw}
            disabled={!canWithdraw || isPending}
            className={`btn secondary ${canWithdraw && !isPending ? "golden-glow" : ""}`}
          >
            {isWithdrawing ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                {t("ui.loading")}
              </span>
            ) : (
              t("actions.cashOut")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
