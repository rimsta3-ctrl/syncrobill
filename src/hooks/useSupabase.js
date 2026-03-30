import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const normalizeAddress = (v = "") => v.toLowerCase();

/**
 * useSupabase
 *
 * Responsabilités :
 *   - Lecture de l'historique des shipments (table `shipments`)
 *   - Insertion d'un nouveau shipment après deposit
 *   - Mise à jour du statut après submitBL et withdraw
 *   - Upload du PDF dans le bucket `documents`
 *
 * Ce hook ne sait rien de MetaMask ni du contrat Solidity.
 * Il expose des fonctions que Terminal branche sur les callbacks
 * de useShipment.
 */
export function useSupabase({ account } = {}) {
  const [transactions,        setTransactions]        = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error,               setError]               = useState("");

  // ---------- fetch history ----------

  const fetchTransactions = useCallback(async () => {
    if (!supabase || !account) {
      setTransactions([]);
      return;
    }
    try {
      setLoadingTransactions(true);
      const { data, error: fetchError } = await supabase
        .from("shipments")
        .select("blockchain_id, buyer, seller, amount, bl_hash, document_url, status")
        .or(`buyer.eq.${account},seller.eq.${account}`)
        .order("blockchain_id", { ascending: false });

      if (fetchError) throw fetchError;

      const me = normalizeAddress(account);
      setTransactions(
        (data || []).filter((row) => {
          const buyer  = normalizeAddress(row.buyer  || "");
          const seller = normalizeAddress(row.seller || "");
          return buyer === me || seller === me;
        })
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to load transaction history.");
    } finally {
      setLoadingTransactions(false);
    }
  }, [account]);

  // Auto-refresh when account changes
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ---------- insert after deposit ----------

  const recordDeposit = async ({ shipmentId, buyer, sellerAddress, depositAmount }) => {
    if (!supabase) return;
    const { error: insertError } = await supabase.from("shipments").insert({
      blockchain_id: Number(shipmentId),
      buyer,
      seller:       sellerAddress,
      amount:       Number(depositAmount),
      bl_hash:      "",
      document_url: null,
      status:       "Locked",
    });
    if (insertError) throw insertError;
    await fetchTransactions();
  };

  // ---------- update after submitBL ----------

  const recordBLSubmission = async ({ shipmentId, hashHex, blFile }) => {
    if (!supabase) return;

    // 1 — upload PDF
    let documentUrl = null;
    if (blFile) {
      const safeName  = blFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath  = `shipments/${shipmentId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, blFile, {
          cacheControl: "3600",
          upsert:       true,
          contentType:  "application/pdf",
        });
      if (uploadError) throw new Error("PDF upload to Supabase failed.");

      const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
      documentUrl = data?.publicUrl || null;
    }

    // 2 — update row
    const { error: updateError } = await supabase
      .from("shipments")
      .update({ bl_hash: hashHex, document_url: documentUrl, status: "Validated" })
      .eq("blockchain_id", Number(shipmentId));

    if (updateError) console.error("DB sync after B/L:", updateError);
    await fetchTransactions();
  };

  // ---------- update after withdraw ----------

  const recordWithdrawal = async ({ shipmentId }) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("shipments")
      .update({ status: "Released" })
      .eq("blockchain_id", Number(shipmentId));
    if (updateError) console.error("DB sync after withdraw:", updateError);
    await fetchTransactions();
  };

  return {
    transactions,
    loadingTransactions,
    error,
    fetchTransactions,
    recordDeposit,
    recordBLSubmission,
    recordWithdrawal,
    clearError: () => setError(""),
  };
}