import React from "react";

const statusMap = {
  0: "En attente de fonds",
  1: "Fonds bloqués",
  2: "Paiement libéré",
};

const getProgressSteps = (status, blHash) => {
  const steps = [
    { label: "Dépôt", active: status >= 0 },
    { label: "B/L Soumis", active: blHash && blHash.length > 0 },
    { label: "Fonds Libérés", active: status === 2 },
  ];
  return steps;
};

export default function ContractInfo({ status, escrowBalance, blHash, loading }) {
  const steps = getProgressSteps(status, blHash);

  return (
    <div className="contract-info card">
      <h2>Vue d'ensemble de la Shipment #1</h2>
      <div className="progress-bar">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`progress-step ${step.active ? 'active' : ''}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="loading">Chargement en cours...</div>
      ) : (
        <>
          <div className="data">
            <div>
              <strong>Montant en Escrow</strong>
              <div className="amount">{escrowBalance}<span>ETH</span></div>
            </div>
            <div>
              <strong>Hash du B/L</strong>
              <div className="hash">{blHash || "Non soumis"}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
