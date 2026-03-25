import React from "react";

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletStatus({ address, balance, networkOk, onConnect, error }) {
  return (
    <div className="wallet-status card">
      <div className="info balance">
        <strong>Solde :</strong> {balance} ETH
      </div>
      <div className="info network">
        <strong>Réseau :</strong> {networkOk ? "Hardhat (31337)" : "Mauvais réseau"}
      </div>
      <div className="info">
        <strong>Adresse :</strong> {address ? shortAddress(address) : "Non connecté"}
      </div>
      {error && <div className="error">{error}</div>}
      <button onClick={onConnect} className="btn">
        Connecter MetaMask
      </button>
    </div>
  );
}
