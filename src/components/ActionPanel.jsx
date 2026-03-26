import React from "react";
import { useI18n } from "../i18n";

export default function ActionPanel({
  depositAmount,
  setDepositAmount,
  sellerAddress,
  setSellerAddress,
  blHashInput,
  setBlHashInput,
  withdrawId,
  setWithdrawId,
  onDeposit,
  onSubmitBL,
  onWithdraw,
  canWithdraw,
  pendingAction,
}) {
  const { t } = useI18n();
  const isPending = pendingAction.length > 0;
  const isDepositing = pendingAction === "deposit";
  const isSubmittingBL = pendingAction === "submitBL";
  const isWithdrawing = pendingAction === "withdraw";

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
          <label>
            {t("actions.blSha")}
            <input
              type="text"
              value={blHashInput}
              onChange={(e) => setBlHashInput(e.target.value)}
              placeholder="0x..."
            />
          </label>
          <button onClick={onSubmitBL} disabled={isPending} className="btn primary">
            {isSubmittingBL ? t("actions.inProgress") : t("actions.submitBL")}
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
