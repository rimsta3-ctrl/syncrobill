import React from "react";
import { useI18n } from "../i18n";

const getProgressSteps = (status, blHash, t) => [
  { label: t("contract.steps.deposit"), active: status >= 0 },
  { label: t("contract.steps.blSubmitted"), active: blHash && blHash.length > 0 },
  { label: t("contract.steps.fundsReleased"), active: status === 2 },
];

export default function ContractInfo({ shipmentId, status, escrowBalance, blHash, loading }) {
  const { t } = useI18n();
  const steps = getProgressSteps(status, blHash, t);

  return (
    <div className="contract-info card">
      <h2>{t("contract.overview", { shipmentId })}</h2>
      <div className="progress-bar">
        {steps.map((step, index) => (
          <div key={index} className={`progress-step ${step.active ? "active" : ""}`} title={step.label}>
            {index + 1}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="loading">{t("contract.loading")}</div>
      ) : (
        <div className="data">
          <div>
            <strong>{t("contract.escrowAmount")}</strong>
            <div className="amount">
              {escrowBalance}
              <span>ETH</span>
            </div>
          </div>
          <div>
            <strong>{t("contract.blHash")}</strong>
            <div className="hash">{blHash || t("contract.notSubmitted")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
