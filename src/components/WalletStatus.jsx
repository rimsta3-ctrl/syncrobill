import React from "react";
import { useTranslation } from "../i18n";

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletStatus({ address, balance, networkOk, onConnect, error }) {
  const { t } = useTranslation();

  return (
    <div className="wallet-status card">
      <div className="info balance">
        <strong>{t("wallet.balance")}:</strong> {balance} ETH
      </div>
      <div className="info network">
        <strong>{t("wallet.network")}:</strong> {networkOk ? t("wallet.expectedNetwork") : t("wallet.wrongNetwork")}
      </div>
      <div className="info">
        <strong>{t("wallet.address")}:</strong> {address ? shortAddress(address) : t("wallet.notConnected")}
      </div>
      {error && <div className="error">{error}</div>}
      <button onClick={onConnect} className="btn">
        {t("wallet.connect")}
      </button>
    </div>
  );
}
