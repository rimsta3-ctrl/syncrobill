import React from "react";
import { useI18n } from "../i18n";

export default function LanguageSwitcher() {
  const { language, setLanguage, languages, t } = useI18n();

  return (
    <label className="language-switcher" aria-label={t("ui.language")}>
      <span>{t("ui.language")}</span>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        {Object.entries(languages).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
