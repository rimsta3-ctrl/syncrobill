import { BrowserProvider, Contract } from "ethers";
import abi from "../abi.json";

export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const EXPECTED_CHAIN_ID = 31337;

export function getProvider() {
  if (!window.ethereum) return null;
  return new BrowserProvider(window.ethereum);
}

export function getContract(providerOrSigner) {
  return new Contract(CONTRACT_ADDRESS, abi, providerOrSigner);
}

export async function getChainId(provider) {
  const network = await provider.getNetwork();
  return network.chainId;
}