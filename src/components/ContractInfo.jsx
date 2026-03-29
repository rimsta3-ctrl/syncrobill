import React from "react";
import { useI18n } from "../i18n";

const STEPS = [
  { key: "proposed", label: "PROPOSED", helper: "Contract created" },
  { key: "funded", label: "FUNDED", helper: "Escrow funded" },
  { key: "validated", label: "VALIDATED", helper: "AI-signed B/L" },
  { key: "settled", label: "SETTLED", helper: "Seller paid" },
  { key: "closed", label: "CLOSED", helper: "Transaction complete" },
];

function hasValidShipmentId(shipmentId) {
  return Boolean(shipmentId && shipmentId !== "None" && Number(shipmentId) > 0);
}

function getStepperState({ canShowProgress, status, hasValidatedProof, hasSettledProof, hasClosedProof }) {
  if (!canShowProgress) {
    return 0;
  }

  if (hasClosedProof) {
    return 5;
  }

  if (hasSettledProof) {
    return 4;
  }

  if (status === 1 && hasValidatedProof) {
    return 3;
  }

  if (status === 1) {
    return 2;
  }

  return 1;
}

export default function ContractInfo({
  shipmentId,
  account,
  status,
  escrowBalance,
  depositedAmount,
  blHash,
  isValidatedByAI,
  loading,
}) {
  const { t } = useI18n();
  const validShipmentId = hasValidShipmentId(shipmentId);
  const hasConnectedAccount = Boolean(account);
  const canShowProgress = validShipmentId && hasConnectedAccount;
  const currentBalance = Number(escrowBalance);
  const initialDepositedAmount = Number(depositedAmount);
  const hasValidatedProof = canShowProgress && Boolean(isValidatedByAI || blHash);
  const hasSettledProof =
    canShowProgress &&
    (Number(status) === 2 ||
      (Number.isFinite(initialDepositedAmount) &&
        Number.isFinite(currentBalance) &&
        currentBalance < initialDepositedAmount));
  const hasClosedProof = canShowProgress && (Number(status) === 3 || currentBalance === 0);
  const currentStep = getStepperState({
    canShowProgress,
    status: Number(status),
    hasValidatedProof,
    hasSettledProof,
    hasClosedProof,
  });
  const progressWidth = canShowProgress
    ? `${(Math.max(currentStep - 1, 0) / (STEPS.length - 1)) * 100}%`
    : "0%";

  return (
    <div className="contract-info card">
      <h2>{t("contract.overview", { shipmentId })}</h2>
      <div className="shipment-stepper" aria-label="Shipment progress">
        <div className="shipment-stepper-track" aria-hidden="true">
          <div className="shipment-stepper-fill" style={{ width: progressWidth }} />
        </div>
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const visualState =
            !canShowProgress
              ? "upcoming"
              : step.key === "closed" && hasClosedProof
                ? "completed"
                : step.key === "settled" && hasSettledProof
                  ? "completed"
                  : step.key === "validated" && hasValidatedProof
                    ? "completed"
                    : stepNumber < currentStep
                      ? "completed"
                      : stepNumber === currentStep
                        ? "current"
                        : "upcoming";

          return (
            <div
              key={step.key}
              className={`shipment-step ${visualState}`}
              aria-current={canShowProgress && stepNumber === currentStep ? "step" : undefined}
            >
              <div className="shipment-step-circle">{stepNumber}</div>
              <div className="shipment-step-copy">
                <div className="shipment-step-label">{step.label}</div>
                <div className="shipment-step-helper">{step.helper}</div>
              </div>
            </div>
          );
        })}
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
      {!loading && canShowProgress && !hasValidatedProof && Number(status) === 1 ? (
        <div className="contract-inline-alert">
          Awaiting AI validation. If the backend rejects the PDF, the flow stays blocked at FUNDED.
        </div>
      ) : null}
    </div>
  );
}
