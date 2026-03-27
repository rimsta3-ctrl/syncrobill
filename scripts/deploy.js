import hre from "hardhat";

async function main() {
  console.log("Deploying Syncrobil contract...");

  const Syncrobil = await hre.ethers.getContractFactory("Syncrobil");
  const syncrobil = await Syncrobil.deploy();

  await syncrobil.waitForDeployment();

  const address = await syncrobil.getAddress();
  console.log(`CONTRAT DEPLOYE A L'ADRESSE : ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
