require("dotenv").config({ path: ".env.deploy" });
require("@nomicfoundation/hardhat-toolbox");

const deployPrivateKey = process.env.DEPLOY_PRIVATE_KEY;
const deployRpcUrl     = process.env.DEPLOY_RPC_URL;

if (!deployPrivateKey || !deployRpcUrl) {
  console.warn(
    "[hardhat] DEPLOY_PRIVATE_KEY ou DEPLOY_RPC_URL manquant dans .env.deploy. " +
    "Le réseau Sepolia sera désactivé."
  );
}

module.exports = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url:      deployRpcUrl     || "",
      accounts: deployPrivateKey ? [deployPrivateKey] : [],
    },
  },
};