import { ethers } from "hardhat";
import "dotenv/config";
import { CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } from "../constants";

const main = async () => {
  const cryptoDevsNFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;
  const cryptoDevsTokenContract = await ethers.getContractFactory("CryptoDevToken");

  const deployedCryptoDevsTokenContract = await cryptoDevsTokenContract.deploy(
    cryptoDevsNFTContract
  );

  await deployedCryptoDevsTokenContract.deployed();
  console.log("Crypto Devs Token Contract Address: ", deployedCryptoDevsTokenContract.address);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


  //0x54C56E4f89314Dea52F5c4A1cb61C2F586d1ccBF