import React from "react";
import { useNavigate } from "react-router-dom";
import InvestmentIdeas from "./InvestmentIdeas";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const scrollToTerminal = () => {
    navigate("/terminal");
  };

  return (
    <div className="app-container">
      <header>
        <h1>Syncrobill</h1>
        <div className="header-actions">
          <LanguageSwitcher />
          <button className="launch-btn" onClick={() => navigate("/terminal")}>
            {t("landing.launchApp")}
          </button>
        </div>
      </header>

      <section className="hero fade-in">
        <h1>{t("landing.heroTitle")}</h1>
        <p>{t("landing.heroDescription")}</p>
        <button className="hero-btn" onClick={scrollToTerminal}>
          {t("landing.enterTerminal")}
        </button>
      </section>

      <section className="opportunities fade-in">
        <h2>{t("landing.opportunitiesTitle")}</h2>
        <p>{t("landing.opportunitiesDescription")}</p>
        <InvestmentIdeas />
        <button className="hero-btn" onClick={scrollToTerminal} style={{ marginTop: "48px" }}>
          {t("landing.enterTerminal")}
        </button>
      </section>
    </div>
  );
};

export default LandingPage;
