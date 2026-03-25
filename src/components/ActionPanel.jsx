import React from "react";

export default function ActionPanel({
  depositAmount,
  setDepositAmount,
  blHashInput,
  setBlHashInput,
  withdrawId,
  setWithdrawId,
  onDeposit,
  onSubmitBL,
  onWithdraw,
  canWithdraw,
  isPending,
}) {
  return (
    <div className="action-panel card">
      <h2>Centre d'Opérations</h2>
      <div className="sections">
        <div className="section">
          <h3>Section Importateur</h3>
          <label>
            Montant (ETH)
            <input
              type="number"
              value={depositAmount}
              min="0"
              step="0.01"
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </label>
          <button onClick={onDeposit} disabled={isPending} className="btn primary">
            {isPending ? "En cours..." : "Déposer des fonds"}
          </button>
        </div>
        <div className="section">
          <h3>Section Exportateur</h3>
          <label>
            SHA-256 du B/L
            <input
              type="text"
              value={blHashInput}
              onChange={(e) => setBlHashInput(e.target.value)}
              placeholder="0x..."
            />
          </label>
          <button onClick={onSubmitBL} disabled={isPending} className="btn primary">
            {isPending ? "En cours..." : "Soumettre le B/L"}
          </button>

          <label style={{ marginTop: "16px", display: "block" }}>
            ID de la shipment (pour retrait)
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
            className={`btn secondary ${canWithdraw && !isPending ? 'golden-glow' : ''}`}
          >
            {isPending ? "En cours..." : "Encaisser les fonds"}
          </button>
        </div>
      </div>
    </div>
  );
}
