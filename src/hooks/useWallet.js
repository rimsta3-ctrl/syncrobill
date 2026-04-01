import { useState, useEffect, useRef } from "react";
import { formatEther } from "ethers";
import {
  getProvider,
  getContract,
  EXPECTED_CHAIN_ID,
  ensureSepoliaNetwork,
} from "../utils/blockchain";

/**
 * useWallet
 *
 * Responsabilités :
 *   - Connexion / déconnexion MetaMask
 *   - Lecture du compte, du solde et du réseau
 *   - Écoute des events MetaMask (accountsChanged, chainChanged)
 *
 * FIX: onNetworkChange n'est plus passé au constructeur du hook
 * (ce qui causait une référence morte si shipmentHook n'était pas
 * encore déclaré). À la place, Terminal appelle setOnNetworkChange()
 * après avoir déclaré shipmentHook.
 */
export function useWallet() {
  const [provider,  setProvider]  = useState(null);
  const [signer,    setSigner]    = useState(null);
  const [account,   setAccount]   = useState("");
  const [balance,   setBalance]   = useState("0");
  const [networkOk, setNetworkOk] = useState(false);
  const [error,     setError]     = useState("");

  // Ref stable pour le callback réseau — Terminal le met à jour
  // après avoir déclaré shipmentHook, sans provoquer de re-render.
  const onNetworkChangeRef = useRef(null);
  const setOnNetworkChange = (fn) => { onNetworkChangeRef.current = fn; };

  // ---------- helpers internes ----------

  const readBalanceAndNetwork = async (providerInstance, signerInstance) => {
    try {
      const network = await providerInstance.getNetwork();
      setNetworkOk(network.chainId === EXPECTED_CHAIN_ID);

      if (signerInstance) {
        const address   = await signerInstance.getAddress();
        const balanceBn = await providerInstance.getBalance(address);
        setAccount(address);
        setBalance(Number(formatEther(balanceBn)).toFixed(4));
      }
    } catch (err) {
      setError(err?.shortMessage || err?.message || "Balance/network error.");
    }
  };

  // ---------- API publique ----------

  const connect = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask is not installed.");
      return false;
    }
    try {
      const providerInstance = getProvider();
      const network = await providerInstance.getNetwork();
      if (network.chainId !== EXPECTED_CHAIN_ID) {
        await ensureSepoliaNetwork();
      }
      await providerInstance.send("eth_requestAccounts", []);
      const signerInstance = await providerInstance.getSigner();

      setProvider(providerInstance);
      setSigner(signerInstance);
      await readBalanceAndNetwork(providerInstance, signerInstance);
      return true;
    } catch (err) {
      const msg =
        err?.code === 4001
          ? "MetaMask connection request was rejected."
          : err?.shortMessage || err?.message || "Wallet connection failed.";
      setError(msg);
      return false;
    }
  };

  const refreshBalance = async () => {
    if (provider && signer) {
      await readBalanceAndNetwork(provider, signer);
    }
  };

  // ---------- listeners MetaMask ----------

  useEffect(() => {
    if (!provider || !signer || !window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setAccount("");
        setBalance("0");
        setSigner(null);
        return;
      }
      // FIX: recreate signer for the new account — the old signer keeps the
      // previous address and all subsequent transactions would be rejected.
      try {
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        await readBalanceAndNetwork(provider, newSigner);
      } catch (err) {
        setError(err?.message || "Failed to update signer after account change.");
      }
    };

    const handleChainChanged = async () => {
      await readBalanceAndNetwork(provider, signer);
      // Appel via ref — toujours la version la plus récente de refresh()
      onNetworkChangeRef.current?.();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged",    handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged",    handleChainChanged);
    };
  }, [provider, signer]);

  return {
    provider,
    signer,
    account,
    balance,
    networkOk,
    error,
    connect,
    refreshBalance,
    setOnNetworkChange,   // ← Terminal l'appelle après avoir déclaré shipmentHook
    clearError: () => setError(""),
  };
}