import React from "react";
import { useTranslation } from "../i18n";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <label className="language-switcher" aria-label={t("ui.language")}>
      <span>{t("ui.language")}</span>
      <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
        {Object.entries(i18n.languages).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
