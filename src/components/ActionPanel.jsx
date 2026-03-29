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
  currentShipmentId,
  status,
  isValidatedByAI,
  onDeposit,
  onSubmitBL,
  onWithdraw,
  canWithdraw,
  pendingAction,
}) {
  const { t } = useTranslation();

  // --- LOGIQUE DE DÉTECTION ---
  const isPending = pendingAction.length > 0;
  const isDepositing = pendingAction === "deposit";
  const isSubmittingBL = pendingAction === "submitBL" || pendingAction === "aiValidation" || pendingAction === "blockchainSignature";
  const isWithdrawing = pendingAction === "withdraw";

  // Force l'affichage si le statut est Validated (1) ou si l'IA a dit OK
  const shouldShowWithdraw = status === 1 || status === "Validated" || isValidatedByAI === true;

  // Si withdrawId est vide, on affiche l'ID actuel du shipment
  const displayId = withdrawId || currentShipmentId || "";

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
        
        {/* SECTION IMPORTATEUR (DÉPÔT) */}
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

        {/* SECTION EXPORTATEUR (B/L & RETRAIT) */}
        <div className="section">
          <h3>{t("actions.exporter")}</h3>
          
          {/* Upload de fichier */}
          <label className="file-upload">
            <span>{t("actions.uploadPdf")}</span>
            <input type="file" accept="application/pdf,.pdf" onChange={onBLFileChange} />
          </label>
          <div className="file-upload-meta">
            <strong>{t("actions.selectedFile")}:</strong> {blFile?.name || t("actions.noFileSelected")}
          </div>
          
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

          {/* ZONE DE RETRAIT - Apparaît dynamiquement */}
          {shouldShowWithdraw && (
            <div className="withdraw-box" style={{ 
              marginTop: "20px", 
              padding: "15px", 
              border: "2px solid #22c55e", 
              borderRadius: "8px",
              backgroundColor: "rgba(34, 197, 94, 0.1)" 
            }}>
              <h4 style={{ color: "#22c55e", marginBottom: "10px" }}>🔓 {t("actions.cashOut")}</h4>
              <label>
                {t("actions.shipmentIdWithdraw")}
                <input
                  type="text"
                  value={displayId}
                  onChange={(e) => setWithdrawId(e.target.value)}
                  placeholder="ID"
                />
              </label>

              <button
                onClick={onWithdraw}
                disabled={isPending} // On retire !canWithdraw pour forcer l'accès en démo
                className={`btn secondary golden-glow`}
                style={{ width: "100%", marginTop: "10px" }}
              >
                {isWithdrawing ? (
                  <span className="btn-loading">
                    <span className="spinner" aria-hidden="true" />
                    {t("ui.loading")}
                  </span>
                ) : (
                  "CONFIRM WITHDRAWAL"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}