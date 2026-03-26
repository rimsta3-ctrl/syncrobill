import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar({ showBack = false, onBack, action = null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        {showBack ? (
          <button className="back-btn navbar-back" onClick={handleBack}>
            &larr; {t("navbar.backHome")}
          </button>
        ) : (
          <h1>Syncrobill</h1>
        )}
      </div>
      <div className="header-actions">
        <LanguageSwitcher />
        {action}
      </div>
    </header>
  );
}
