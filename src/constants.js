import contractABI from "./abis/Syncrobil.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0x95980612f4eD5aF208A18EF011acF99658508872";

export const RESOLVED_CONTRACT_ABI = Array.isArray(contractABI?.abi)
  ? contractABI.abi
  : Array.isArray(contractABI)
    ? contractABI
    : [];
