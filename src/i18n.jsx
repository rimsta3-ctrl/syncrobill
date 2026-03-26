import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const translations = {
  en: {
    ui: {
      language: "Language",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "Loading...",
    },
    landing: {
      launchApp: "Launch App",
      heroTitle: "Trade Finance Excellence",
      heroDescription:
        "Discover a premium platform where smart contract security meets the elegance of traditional finance. Your international transactions are now protected by the immutable power of blockchain.",
      enterTerminal: "ENTER THE TRANSACTION TERMINAL",
      opportunitiesTitle: "Market Intelligence & Opportunities",
      opportunitiesDescription:
        "Insights based on real-time global flows. Invest with the power of data.",
    },
    wallet: {
      balance: "Balance",
      network: "Network",
      wrongNetwork: "Wrong network",
      address: "Address",
      notConnected: "Not connected",
      connect: "Connect MetaMask",
    },
    contract: {
      steps: {
        deposit: "Deposit",
        blSubmitted: "B/L Submitted",
        fundsReleased: "Funds Released",
      },
      overview: ({ shipmentId }) => `Shipment Overview #${shipmentId || "None"}`,
      escrowAmount: "Escrow Amount",
      blHash: "B/L Hash",
      notSubmitted: "Not submitted",
      loading: "Loading...",
    },
    actions: {
      center: "Operations Center",
      importer: "Importer Section",
      sellerAddress: "Seller address",
      amountEth: "Amount (ETH)",
      depositFunds: "Deposit funds",
      exporter: "Exporter Section",
      blSha: "B/L SHA-256",
      submitBL: "Submit B/L",
      shipmentIdWithdraw: "Shipment ID (for withdrawal)",
      cashOut: "Release funds",
      inProgress: "In progress...",
    },
    terminal: {
      backHome: "BACK TO HOME",
      title: "Syncrobill Transaction Terminal",
      footer: "Network: Hardhat Local | Contract: 0x5FbDB...aa3",
      historyTitle: "Transaction History",
      loadingHistory: "Loading history...",
      noTransactions: "No transactions recorded yet.",
      table: {
        id: "ID",
        buyer: "Buyer",
        seller: "Seller",
        amount: "Amount",
        blHash: "B/L Hash",
        status: "Status",
      },
      status: {
        locked: "Locked",
        released: "Released",
      },
      errors: {
        historyLoad: "Unable to load Supabase history.",
        contractRead: "Unable to read contract state.",
        balanceNetwork: "Error while reading balance or network.",
        metamaskMissing: "MetaMask is not installed.",
        providerCreate: "Unable to create the MetaMask provider.",
        walletConnect: "Wallet connection failed.",
        connectWalletFirst: "Connect your wallet first.",
        invalidDepositAmount: "Enter a valid deposit amount.",
        invalidSellerAddress: "Enter a valid seller address.",
        depositFailed: "Deposit failed.",
        invalidBLHash: "Enter a valid B/L hash.",
        noShipmentForBL: "No shipment is available to attach this B/L.",
        submitBLFailed: "B/L submission failed.",
        invalidShipmentId: "Enter a valid shipment ID for withdrawal.",
        withdrawFailed:
          "Withdrawal failed. Verify that you are the exporter and that the B/L has been submitted.",
      },
      messages: {
        connected: "Connected successfully.",
        sendingDeposit: "Sending deposit transaction...",
        depositSuccess: ({ shipmentId }) =>
          `Deposit completed successfully. Shipment #${shipmentId} was saved to Supabase.`,
        sendingBL: "Sending B/L submission transaction...",
        blSuccess: ({ shipmentId }) => `B/L submitted successfully for shipment #${shipmentId}.`,
        sendingWithdraw: "Sending withdrawal transaction...",
        withdrawSuccess: "Funds were released successfully to the exporter.",
      },
    },
  },
  fr: {
    ui: {
      language: "Langue",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "Chargement...",
    },
    landing: {
      launchApp: "Lancer l'application",
      heroTitle: "L'excellence de la trade finance",
      heroDescription:
        "Découvrez une plateforme premium où la sécurité des smart contracts rencontre l'élégance de la finance traditionnelle. Vos transactions internationales sont désormais protégées par la puissance immuable de la blockchain.",
      enterTerminal: "ENTRER DANS LE TERMINAL DE TRANSACTION",
      opportunitiesTitle: "Intelligence de marché et opportunités",
      opportunitiesDescription:
        "Des analyses basées sur les flux mondiaux en temps réel. Investissez avec la puissance de la donnée.",
    },
    wallet: {
      balance: "Solde",
      network: "Réseau",
      wrongNetwork: "Mauvais réseau",
      address: "Adresse",
      notConnected: "Non connecté",
      connect: "Connecter MetaMask",
    },
    contract: {
      steps: {
        deposit: "Dépôt",
        blSubmitted: "B/L soumis",
        fundsReleased: "Fonds libérés",
      },
      overview: ({ shipmentId }) => `Vue d'ensemble de la shipment #${shipmentId || "Aucune"}`,
      escrowAmount: "Montant en escrow",
      blHash: "Hash du B/L",
      notSubmitted: "Non soumis",
      loading: "Chargement...",
    },
    actions: {
      center: "Centre d'opérations",
      importer: "Section importateur",
      sellerAddress: "Adresse du vendeur",
      amountEth: "Montant (ETH)",
      depositFunds: "Déposer des fonds",
      exporter: "Section exportateur",
      blSha: "SHA-256 du B/L",
      submitBL: "Soumettre le B/L",
      shipmentIdWithdraw: "ID de la shipment (pour retrait)",
      cashOut: "Encaisser les fonds",
      inProgress: "En cours...",
    },
    terminal: {
      backHome: "RETOUR À L'ACCUEIL",
      title: "Terminal de transaction Syncrobill",
      footer: "Réseau : Hardhat Local | Contrat : 0x5FbDB...aa3",
      historyTitle: "Historique des transactions",
      loadingHistory: "Chargement de l'historique...",
      noTransactions: "Aucune transaction enregistrée pour le moment.",
      table: {
        id: "ID",
        buyer: "Acheteur",
        seller: "Vendeur",
        amount: "Montant",
        blHash: "Hash du B/L",
        status: "Statut",
      },
      status: {
        locked: "Bloqué",
        released: "Libéré",
      },
      errors: {
        historyLoad: "Impossible de charger l'historique Supabase.",
        contractRead: "Impossible de lire l'état du contrat.",
        balanceNetwork: "Erreur lors de la lecture du solde ou du réseau.",
        metamaskMissing: "MetaMask n'est pas installé.",
        providerCreate: "Impossible de créer le provider MetaMask.",
        walletConnect: "Erreur de connexion au portefeuille.",
        connectWalletFirst: "Connectez votre portefeuille d'abord.",
        invalidDepositAmount: "Entrez un montant de dépôt valide.",
        invalidSellerAddress: "Entrez une adresse vendeur valide.",
        depositFailed: "Erreur lors du dépôt.",
        invalidBLHash: "Entrez un hash B/L valide.",
        noShipmentForBL: "Aucune shipment disponible pour associer ce B/L.",
        submitBLFailed: "Erreur lors de l'envoi du B/L.",
        invalidShipmentId: "Entrez un ID de shipment valide pour le retrait.",
        withdrawFailed:
          "Erreur lors du retrait. Vérifiez que vous êtes l'exportateur et que le B/L a été soumis.",
      },
      messages: {
        connected: "Connecté avec succès.",
        sendingDeposit: "Envoi de la transaction de dépôt...",
        depositSuccess: ({ shipmentId }) =>
          `Dépôt effectué avec succès. La shipment #${shipmentId} a été enregistrée dans Supabase.`,
        sendingBL: "Envoi de la transaction de soumission du B/L...",
        blSuccess: ({ shipmentId }) => `B/L publié avec succès pour la shipment #${shipmentId}.`,
        sendingWithdraw: "Envoi de la transaction de retrait...",
        withdrawSuccess: "Les fonds ont été transférés avec succès à l'exportateur.",
      },
    },
  },
  de: {
    ui: {
      language: "Sprache",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "Wird geladen...",
    },
    landing: {
      launchApp: "App starten",
      heroTitle: "Exzellenz im Trade Finance",
      heroDescription:
        "Entdecken Sie eine Premium-Plattform, auf der die Sicherheit von Smart Contracts auf die Eleganz traditioneller Finanzprozesse trifft. Ihre internationalen Transaktionen werden jetzt durch die unveränderliche Stärke der Blockchain geschützt.",
      enterTerminal: "ZUM TRANSAKTIONSTERMINAL",
      opportunitiesTitle: "Marktintelligenz und Chancen",
      opportunitiesDescription:
        "Analysen auf Basis globaler Echtzeitströme. Investieren Sie mit der Kraft von Daten.",
    },
    wallet: {
      balance: "Kontostand",
      network: "Netzwerk",
      wrongNetwork: "Falsches Netzwerk",
      address: "Adresse",
      notConnected: "Nicht verbunden",
      connect: "MetaMask verbinden",
    },
    contract: {
      steps: {
        deposit: "Einzahlung",
        blSubmitted: "B/L übermittelt",
        fundsReleased: "Mittel freigegeben",
      },
      overview: ({ shipmentId }) => `Sendungsübersicht #${shipmentId || "Keine"}`,
      escrowAmount: "Escrow-Betrag",
      blHash: "B/L-Hash",
      notSubmitted: "Nicht übermittelt",
      loading: "Wird geladen...",
    },
    actions: {
      center: "Operationszentrum",
      importer: "Importeur-Bereich",
      sellerAddress: "Verkäuferadresse",
      amountEth: "Betrag (ETH)",
      depositFunds: "Mittel einzahlen",
      exporter: "Exporteur-Bereich",
      blSha: "B/L SHA-256",
      submitBL: "B/L übermitteln",
      shipmentIdWithdraw: "Sendungs-ID (für Auszahlung)",
      cashOut: "Mittel freigeben",
      inProgress: "Wird verarbeitet...",
    },
    terminal: {
      backHome: "ZURÜCK ZUR STARTSEITE",
      title: "Syncrobill-Transaktionsterminal",
      footer: "Netzwerk: Hardhat Local | Vertrag: 0x5FbDB...aa3",
      historyTitle: "Transaktionsverlauf",
      loadingHistory: "Verlauf wird geladen...",
      noTransactions: "Noch keine Transaktionen erfasst.",
      table: {
        id: "ID",
        buyer: "Käufer",
        seller: "Verkäufer",
        amount: "Betrag",
        blHash: "B/L-Hash",
        status: "Status",
      },
      status: {
        locked: "Gesperrt",
        released: "Freigegeben",
      },
      errors: {
        historyLoad: "Supabase-Verlauf konnte nicht geladen werden.",
        contractRead: "Vertragsstatus konnte nicht gelesen werden.",
        balanceNetwork: "Fehler beim Lesen von Kontostand oder Netzwerk.",
        metamaskMissing: "MetaMask ist nicht installiert.",
        providerCreate: "MetaMask-Provider konnte nicht erstellt werden.",
        walletConnect: "Wallet-Verbindung fehlgeschlagen.",
        connectWalletFirst: "Verbinden Sie zuerst Ihre Wallet.",
        invalidDepositAmount: "Geben Sie einen gültigen Einzahlungsbetrag ein.",
        invalidSellerAddress: "Geben Sie eine gültige Verkäuferadresse ein.",
        depositFailed: "Einzahlung fehlgeschlagen.",
        invalidBLHash: "Geben Sie einen gültigen B/L-Hash ein.",
        noShipmentForBL: "Keine Sendung verfügbar, um dieses B/L zuzuordnen.",
        submitBLFailed: "B/L-Übermittlung fehlgeschlagen.",
        invalidShipmentId: "Geben Sie eine gültige Sendungs-ID für die Auszahlung ein.",
        withdrawFailed:
          "Auszahlung fehlgeschlagen. Prüfen Sie, ob Sie der Exporteur sind und das B/L übermittelt wurde.",
      },
      messages: {
        connected: "Erfolgreich verbunden.",
        sendingDeposit: "Einzahlungstransaktion wird gesendet...",
        depositSuccess: ({ shipmentId }) =>
          `Einzahlung erfolgreich abgeschlossen. Sendung #${shipmentId} wurde in Supabase gespeichert.`,
        sendingBL: "B/L-Übermittlung wird gesendet...",
        blSuccess: ({ shipmentId }) =>
          `B/L wurde erfolgreich für Sendung #${shipmentId} übermittelt.`,
        sendingWithdraw: "Auszahlungstransaktion wird gesendet...",
        withdrawSuccess: "Die Mittel wurden erfolgreich an den Exporteur freigegeben.",
      },
    },
  },
  it: {
    ui: {
      language: "Lingua",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "Caricamento...",
    },
    landing: {
      launchApp: "Avvia app",
      heroTitle: "Eccellenza nella trade finance",
      heroDescription:
        "Scopri una piattaforma premium in cui la sicurezza degli smart contract incontra l'eleganza della finanza tradizionale. Le tue transazioni internazionali sono ora protette dalla potenza immutabile della blockchain.",
      enterTerminal: "ENTRA NEL TERMINAL DI TRANSAZIONE",
      opportunitiesTitle: "Intelligence di mercato e opportunità",
      opportunitiesDescription:
        "Analisi basate sui flussi globali in tempo reale. Investi con la forza dei dati.",
    },
    wallet: {
      balance: "Saldo",
      network: "Rete",
      wrongNetwork: "Rete errata",
      address: "Indirizzo",
      notConnected: "Non connesso",
      connect: "Connetti MetaMask",
    },
    contract: {
      steps: {
        deposit: "Deposito",
        blSubmitted: "B/L inviato",
        fundsReleased: "Fondi rilasciati",
      },
      overview: ({ shipmentId }) => `Panoramica spedizione #${shipmentId || "Nessuna"}`,
      escrowAmount: "Importo in escrow",
      blHash: "Hash del B/L",
      notSubmitted: "Non inviato",
      loading: "Caricamento...",
    },
    actions: {
      center: "Centro operativo",
      importer: "Sezione importatore",
      sellerAddress: "Indirizzo del venditore",
      amountEth: "Importo (ETH)",
      depositFunds: "Deposita fondi",
      exporter: "Sezione esportatore",
      blSha: "SHA-256 del B/L",
      submitBL: "Invia B/L",
      shipmentIdWithdraw: "ID spedizione (per il prelievo)",
      cashOut: "Rilascia fondi",
      inProgress: "In corso...",
    },
    terminal: {
      backHome: "TORNA ALLA HOME",
      title: "Terminale transazioni Syncrobill",
      footer: "Rete: Hardhat Local | Contratto: 0x5FbDB...aa3",
      historyTitle: "Storico transazioni",
      loadingHistory: "Caricamento storico...",
      noTransactions: "Nessuna transazione registrata al momento.",
      table: {
        id: "ID",
        buyer: "Acquirente",
        seller: "Venditore",
        amount: "Importo",
        blHash: "Hash B/L",
        status: "Stato",
      },
      status: {
        locked: "Bloccato",
        released: "Rilasciato",
      },
      errors: {
        historyLoad: "Impossibile caricare lo storico Supabase.",
        contractRead: "Impossibile leggere lo stato del contratto.",
        balanceNetwork: "Errore durante la lettura del saldo o della rete.",
        metamaskMissing: "MetaMask non è installato.",
        providerCreate: "Impossibile creare il provider MetaMask.",
        walletConnect: "Connessione al wallet non riuscita.",
        connectWalletFirst: "Connetti prima il tuo wallet.",
        invalidDepositAmount: "Inserisci un importo di deposito valido.",
        invalidSellerAddress: "Inserisci un indirizzo venditore valido.",
        depositFailed: "Deposito non riuscito.",
        invalidBLHash: "Inserisci un hash B/L valido.",
        noShipmentForBL: "Nessuna spedizione disponibile per associare questo B/L.",
        submitBLFailed: "Invio del B/L non riuscito.",
        invalidShipmentId: "Inserisci un ID spedizione valido per il prelievo.",
        withdrawFailed:
          "Prelievo non riuscito. Verifica di essere l'esportatore e che il B/L sia stato inviato.",
      },
      messages: {
        connected: "Connesso con successo.",
        sendingDeposit: "Invio della transazione di deposito...",
        depositSuccess: ({ shipmentId }) =>
          `Deposito completato con successo. La spedizione #${shipmentId} è stata salvata in Supabase.`,
        sendingBL: "Invio della transazione B/L...",
        blSuccess: ({ shipmentId }) =>
          `B/L inviato con successo per la spedizione #${shipmentId}.`,
        sendingWithdraw: "Invio della transazione di prelievo...",
        withdrawSuccess: "I fondi sono stati rilasciati con successo all'esportatore.",
      },
    },
  },
  es: {
    ui: {
      language: "Idioma",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "Cargando...",
    },
    landing: {
      launchApp: "Abrir app",
      heroTitle: "Excelencia en trade finance",
      heroDescription:
        "Descubre una plataforma premium donde la seguridad de los smart contracts se une con la elegancia de las finanzas tradicionales. Tus transacciones internacionales ahora están protegidas por el poder inmutable de la blockchain.",
      enterTerminal: "ENTRAR AL TERMINAL DE TRANSACCIONES",
      opportunitiesTitle: "Inteligencia de mercado y oportunidades",
      opportunitiesDescription:
        "Análisis basados en flujos globales en tiempo real. Invierte con el poder de los datos.",
    },
    wallet: {
      balance: "Saldo",
      network: "Red",
      wrongNetwork: "Red incorrecta",
      address: "Dirección",
      notConnected: "No conectado",
      connect: "Conectar MetaMask",
    },
    contract: {
      steps: {
        deposit: "Depósito",
        blSubmitted: "B/L enviado",
        fundsReleased: "Fondos liberados",
      },
      overview: ({ shipmentId }) => `Resumen del envío #${shipmentId || "Ninguno"}`,
      escrowAmount: "Importe en escrow",
      blHash: "Hash del B/L",
      notSubmitted: "No enviado",
      loading: "Cargando...",
    },
    actions: {
      center: "Centro de operaciones",
      importer: "Sección importador",
      sellerAddress: "Dirección del vendedor",
      amountEth: "Monto (ETH)",
      depositFunds: "Depositar fondos",
      exporter: "Sección exportador",
      blSha: "SHA-256 del B/L",
      submitBL: "Enviar B/L",
      shipmentIdWithdraw: "ID del envío (para retiro)",
      cashOut: "Liberar fondos",
      inProgress: "En progreso...",
    },
    terminal: {
      backHome: "VOLVER AL INICIO",
      title: "Terminal de transacciones Syncrobill",
      footer: "Red: Hardhat Local | Contrato: 0x5FbDB...aa3",
      historyTitle: "Historial de transacciones",
      loadingHistory: "Cargando historial...",
      noTransactions: "Aún no hay transacciones registradas.",
      table: {
        id: "ID",
        buyer: "Comprador",
        seller: "Vendedor",
        amount: "Monto",
        blHash: "Hash B/L",
        status: "Estado",
      },
      status: {
        locked: "Bloqueado",
        released: "Liberado",
      },
      errors: {
        historyLoad: "No se pudo cargar el historial de Supabase.",
        contractRead: "No se pudo leer el estado del contrato.",
        balanceNetwork: "Error al leer el saldo o la red.",
        metamaskMissing: "MetaMask no está instalado.",
        providerCreate: "No se pudo crear el provider de MetaMask.",
        walletConnect: "Error al conectar la wallet.",
        connectWalletFirst: "Conecta tu wallet primero.",
        invalidDepositAmount: "Introduce un monto de depósito válido.",
        invalidSellerAddress: "Introduce una dirección de vendedor válida.",
        depositFailed: "El depósito falló.",
        invalidBLHash: "Introduce un hash B/L válido.",
        noShipmentForBL: "No hay ningún envío disponible para asociar este B/L.",
        submitBLFailed: "El envío del B/L falló.",
        invalidShipmentId: "Introduce un ID de envío válido para el retiro.",
        withdrawFailed:
          "El retiro falló. Verifica que eres el exportador y que el B/L fue enviado.",
      },
      messages: {
        connected: "Conectado correctamente.",
        sendingDeposit: "Enviando transacción de depósito...",
        depositSuccess: ({ shipmentId }) =>
          `Depósito completado correctamente. El envío #${shipmentId} se guardó en Supabase.`,
        sendingBL: "Enviando transacción de B/L...",
        blSuccess: ({ shipmentId }) => `B/L enviado correctamente para el envío #${shipmentId}.`,
        sendingWithdraw: "Enviando transacción de retiro...",
        withdrawSuccess: "Los fondos se liberaron correctamente al exportador.",
      },
    },
  },
  ar: {
    ui: {
      language: "اللغة",
      languages: {
        en: "English",
        fr: "Français",
        de: "Deutsch",
        it: "Italiano",
        es: "Español",
        ar: "العربية",
      },
      loading: "جارٍ التحميل...",
    },
    landing: {
      launchApp: "تشغيل التطبيق",
      heroTitle: "التميّز في تمويل التجارة",
      heroDescription:
        "اكتشف منصة متميزة تلتقي فيها قوة العقود الذكية بأناقة التمويل التقليدي. أصبحت معاملاتك الدولية الآن محمية بقوة البلوك تشين غير القابلة للتغيير.",
      enterTerminal: "الدخول إلى محطة المعاملات",
      opportunitiesTitle: "ذكاء السوق والفرص",
      opportunitiesDescription:
        "تحليلات مبنية على التدفقات العالمية في الوقت الفعلي. استثمر بقوة البيانات.",
    },
    wallet: {
      balance: "الرصيد",
      network: "الشبكة",
      wrongNetwork: "شبكة غير صحيحة",
      address: "العنوان",
      notConnected: "غير متصل",
      connect: "ربط MetaMask",
    },
    contract: {
      steps: {
        deposit: "إيداع",
        blSubmitted: "تم إرسال بوليصة الشحن",
        fundsReleased: "تم الإفراج عن الأموال",
      },
      overview: ({ shipmentId }) => `نظرة عامة على الشحنة #${shipmentId || "لا يوجد"}`,
      escrowAmount: "المبلغ في الضمان",
      blHash: "بصمة بوليصة الشحن",
      notSubmitted: "لم يتم الإرسال",
      loading: "جارٍ التحميل...",
    },
    actions: {
      center: "مركز العمليات",
      importer: "قسم المستورد",
      sellerAddress: "عنوان البائع",
      amountEth: "المبلغ (ETH)",
      depositFunds: "إيداع الأموال",
      exporter: "قسم المصدّر",
      blSha: "SHA-256 لبوليصة الشحن",
      submitBL: "إرسال بوليصة الشحن",
      shipmentIdWithdraw: "معرّف الشحنة (للسحب)",
      cashOut: "تحرير الأموال",
      inProgress: "جارٍ التنفيذ...",
    },
    terminal: {
      backHome: "العودة إلى الرئيسية",
      title: "محطة معاملات Syncrobill",
      footer: "الشبكة: Hardhat Local | العقد: 0x5FbDB...aa3",
      historyTitle: "سجل المعاملات",
      loadingHistory: "جارٍ تحميل السجل...",
      noTransactions: "لا توجد معاملات مسجّلة حتى الآن.",
      table: {
        id: "المعرّف",
        buyer: "المشتري",
        seller: "البائع",
        amount: "المبلغ",
        blHash: "بصمة بوليصة الشحن",
        status: "الحالة",
      },
      status: {
        locked: "مقفل",
        released: "محرر",
      },
      errors: {
        historyLoad: "تعذّر تحميل سجل Supabase.",
        contractRead: "تعذّرت قراءة حالة العقد.",
        balanceNetwork: "حدث خطأ أثناء قراءة الرصيد أو الشبكة.",
        metamaskMissing: "MetaMask غير مثبت.",
        providerCreate: "تعذّر إنشاء مزوّد MetaMask.",
        walletConnect: "فشل الاتصال بالمحفظة.",
        connectWalletFirst: "يرجى ربط المحفظة أولاً.",
        invalidDepositAmount: "أدخل مبلغ إيداع صالحاً.",
        invalidSellerAddress: "أدخل عنوان بائع صالحاً.",
        depositFailed: "فشل الإيداع.",
        invalidBLHash: "أدخل بصمة بوليصة شحن صالحة.",
        noShipmentForBL: "لا توجد شحنة متاحة لإرفاق بوليصة الشحن هذه.",
        submitBLFailed: "فشل إرسال بوليصة الشحن.",
        invalidShipmentId: "أدخل معرّف شحنة صالحاً للسحب.",
        withdrawFailed:
          "فشل السحب. تأكد أنك المصدّر وأن بوليصة الشحن تم إرسالها.",
      },
      messages: {
        connected: "تم الاتصال بنجاح.",
        sendingDeposit: "جارٍ إرسال معاملة الإيداع...",
        depositSuccess: ({ shipmentId }) =>
          `تم الإيداع بنجاح. تم حفظ الشحنة #${shipmentId} في Supabase.`,
        sendingBL: "جارٍ إرسال معاملة بوليصة الشحن...",
        blSuccess: ({ shipmentId }) => `تم إرسال بوليصة الشحن بنجاح للشحنة #${shipmentId}.`,
        sendingWithdraw: "جارٍ إرسال معاملة السحب...",
        withdrawSuccess: "تم تحرير الأموال بنجاح إلى المصدّر.",
      },
    },
  },
};

const translationExtensions = {
  en: {
    ui: {
      languages: {
        en: "English",
        fr: "French",
        de: "German",
        it: "Italian",
        es: "Spanish",
        ar: "Arabic",
      },
    },
    navbar: {
      home: "Home",
      backHome: "Back to Home",
    },
    actions: {
      uploadPdf: "Upload B/L PDF",
      uploadHint: "Only PDF files are accepted.",
      selectedFile: "Selected file",
      noFileSelected: "No PDF selected",
      uploadAndSubmit: "Upload PDF & Submit B/L",
      uploading: "Uploading PDF...",
    },
    terminal: {
      table: {
        document: "Document",
      },
      document: {
        open: "Open document",
        missing: "No document",
      },
      errors: {
        supabaseMissing: "Supabase is not configured.",
        invalidPdf: "Select a PDF file before submitting the B/L.",
        uploadFailed: "PDF upload failed.",
        hashFailed: "Unable to generate the PDF hash.",
      },
      messages: {
        uploadingDocument: "Uploading the PDF, storing it in Supabase, and submitting the B/L...",
      },
    },
  },
  fr: {
    ui: {
      languages: {
        en: "Anglais",
        fr: "Français",
        de: "Allemand",
        it: "Italien",
        es: "Espagnol",
        ar: "Arabe",
      },
    },
    navbar: {
      home: "Accueil",
      backHome: "Retour à l'accueil",
    },
    actions: {
      uploadPdf: "Téléverser le PDF du B/L",
      uploadHint: "Seuls les fichiers PDF sont acceptés.",
      selectedFile: "Fichier sélectionné",
      noFileSelected: "Aucun PDF sélectionné",
      uploadAndSubmit: "Téléverser le PDF et soumettre le B/L",
      uploading: "Téléversement du PDF...",
    },
    terminal: {
      table: {
        document: "Document",
      },
      document: {
        open: "Ouvrir le document",
        missing: "Aucun document",
      },
      errors: {
        supabaseMissing: "Supabase n'est pas configuré.",
        invalidPdf: "Sélectionnez un fichier PDF avant de soumettre le B/L.",
        uploadFailed: "Le téléversement du PDF a échoué.",
        hashFailed: "Impossible de générer le hash du PDF.",
      },
      messages: {
        uploadingDocument:
          "Téléversement du PDF, enregistrement dans Supabase et soumission du B/L...",
      },
    },
  },
  de: {
    ui: {
      languages: {
        en: "Englisch",
        fr: "Französisch",
        de: "Deutsch",
        it: "Italienisch",
        es: "Spanisch",
        ar: "Arabisch",
      },
    },
    navbar: {
      home: "Startseite",
      backHome: "Zurück zur Startseite",
    },
    actions: {
      uploadPdf: "B/L-PDF hochladen",
      uploadHint: "Nur PDF-Dateien werden akzeptiert.",
      selectedFile: "Ausgewählte Datei",
      noFileSelected: "Kein PDF ausgewählt",
      uploadAndSubmit: "PDF hochladen und B/L übermitteln",
      uploading: "PDF wird hochgeladen...",
    },
    terminal: {
      table: {
        document: "Dokument",
      },
      document: {
        open: "Dokument öffnen",
        missing: "Kein Dokument",
      },
      errors: {
        supabaseMissing: "Supabase ist nicht konfiguriert.",
        invalidPdf: "Wählen Sie vor dem Übermitteln des B/L eine PDF-Datei aus.",
        uploadFailed: "PDF-Upload fehlgeschlagen.",
        hashFailed: "PDF-Hash konnte nicht erzeugt werden.",
      },
      messages: {
        uploadingDocument:
          "PDF wird hochgeladen, in Supabase gespeichert und das B/L wird übermittelt...",
      },
    },
  },
  it: {
    ui: {
      languages: {
        en: "Inglese",
        fr: "Francese",
        de: "Tedesco",
        it: "Italiano",
        es: "Spagnolo",
        ar: "Arabo",
      },
    },
    navbar: {
      home: "Home",
      backHome: "Torna alla home",
    },
    actions: {
      uploadPdf: "Carica PDF del B/L",
      uploadHint: "Sono accettati solo file PDF.",
      selectedFile: "File selezionato",
      noFileSelected: "Nessun PDF selezionato",
      uploadAndSubmit: "Carica PDF e invia B/L",
      uploading: "Caricamento PDF...",
    },
    terminal: {
      table: {
        document: "Documento",
      },
      document: {
        open: "Apri documento",
        missing: "Nessun documento",
      },
      errors: {
        supabaseMissing: "Supabase non è configurato.",
        invalidPdf: "Seleziona un file PDF prima di inviare il B/L.",
        uploadFailed: "Caricamento PDF non riuscito.",
        hashFailed: "Impossibile generare l'hash del PDF.",
      },
      messages: {
        uploadingDocument:
          "Caricamento del PDF, salvataggio in Supabase e invio del B/L...",
      },
    },
  },
  es: {
    ui: {
      languages: {
        en: "Inglés",
        fr: "Francés",
        de: "Alemán",
        it: "Italiano",
        es: "Español",
        ar: "Árabe",
      },
    },
    navbar: {
      home: "Inicio",
      backHome: "Volver al inicio",
    },
    actions: {
      uploadPdf: "Subir PDF del B/L",
      uploadHint: "Solo se aceptan archivos PDF.",
      selectedFile: "Archivo seleccionado",
      noFileSelected: "Ningún PDF seleccionado",
      uploadAndSubmit: "Subir PDF y enviar B/L",
      uploading: "Subiendo PDF...",
    },
    terminal: {
      table: {
        document: "Documento",
      },
      document: {
        open: "Abrir documento",
        missing: "Sin documento",
      },
      errors: {
        supabaseMissing: "Supabase no está configurado.",
        invalidPdf: "Selecciona un archivo PDF antes de enviar el B/L.",
        uploadFailed: "La subida del PDF falló.",
        hashFailed: "No se pudo generar el hash del PDF.",
      },
      messages: {
        uploadingDocument:
          "Subiendo el PDF, guardándolo en Supabase y enviando el B/L...",
      },
    },
  },
  ar: {
    ui: {
      languages: {
        en: "الإنجليزية",
        fr: "الفرنسية",
        de: "الألمانية",
        it: "الإيطالية",
        es: "الإسبانية",
        ar: "العربية",
      },
    },
    navbar: {
      home: "الرئيسية",
      backHome: "العودة إلى الرئيسية",
    },
    actions: {
      uploadPdf: "رفع ملف PDF لبوليصة الشحن",
      uploadHint: "يُسمح فقط بملفات PDF.",
      selectedFile: "الملف المحدد",
      noFileSelected: "لم يتم اختيار PDF",
      uploadAndSubmit: "رفع PDF وإرسال بوليصة الشحن",
      uploading: "جارٍ رفع ملف PDF...",
    },
    terminal: {
      table: {
        document: "المستند",
      },
      document: {
        open: "فتح المستند",
        missing: "لا يوجد مستند",
      },
      errors: {
        supabaseMissing: "لم يتم إعداد Supabase.",
        invalidPdf: "اختر ملف PDF قبل إرسال بوليصة الشحن.",
        uploadFailed: "فشل رفع ملف PDF.",
        hashFailed: "تعذر إنشاء بصمة PDF.",
      },
      messages: {
        uploadingDocument:
          "جارٍ رفع ملف PDF وحفظه في Supabase ثم إرسال بوليصة الشحن...",
      },
    },
  },
};

function deepMerge(base, override) {
  if (!override) return base;
  const output = { ...base };

  Object.keys(override).forEach((key) => {
    const baseValue = output[key];
    const overrideValue = override[key];

    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      output[key] = deepMerge(baseValue, overrideValue);
    } else {
      output[key] = overrideValue;
    }
  });

  return output;
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("syncrobill-language") || "en");

  useEffect(() => {
    localStorage.setItem("syncrobill-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo(() => {
    const dictionary = deepMerge(
      deepMerge(translations.en, translationExtensions.en),
      deepMerge(translations[language] || {}, translationExtensions[language] || {})
    );

    const t = (key, params) => {
      const result = key.split(".").reduce((acc, part) => acc?.[part], dictionary);

      if (typeof result === "function") {
        return result(params || {});
      }

      if (result !== undefined) {
        return result;
      }

      const fallback = key.split(".").reduce((acc, part) => acc?.[part], translations.en);
      return typeof fallback === "function" ? fallback(params || {}) : fallback || key;
    };

    return {
      language,
      setLanguage,
      languages: translations.en.ui.languages,
      t,
      isRTL: language === "ar",
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used within a LanguageProvider.");
  }

  return context;
}

export function useTranslation() {
  const { t, language, setLanguage, languages, isRTL } = useI18n();

  return {
    t,
    i18n: {
      language,
      changeLanguage: setLanguage,
      languages,
      dir: isRTL ? "rtl" : "ltr",
    },
  };
}
