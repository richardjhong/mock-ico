"use client";

import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../../constants";

const Home = () => {
  const zero = BigNumber.from(0);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState<BigNumber>(zero);
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState<BigNumber>(zero);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [tokensMinted, setTokensMinted] = useState<BigNumber>(zero);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const web3ModalRef = useRef<Web3Modal | undefined>(undefined);

  /**
   * getTokensToBeClaimed: Checks the balance of tokens that can be claimed by the user
   */
  const getTokensToBeClaimed = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const address = await signer.getAddress();
      const balance = await nftContract.balanceOf(address);
      console.log("balance normal: ", balance);

      if (balance === zero) {
        console.log("is this being read");
        setTokensToBeClaimed(zero);
      } else {
        // tracking number of unclaimed tokens
        var amount = 0;
        for (let i = 0; i < balance; i++) {
          // For all the NFTs, check if token has already been claimed
          // If not, increase amount
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          console.log("tokenId: ", tokenId);
          console.log("claimed: ", claimed);
          if (!claimed) amount++;
        }
        console.log("amount of tokens: ", amount);
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };

  /**
   * getBalanceOfCryptoDevTokens: Checks the balance of Crypto Dev Tokens held by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const address = await signer.getAddress();
      const balance = await tokenContract.balanceOf(address);

      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  /**
   * mintCryptoDevToken: mints `amount` number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount: number) => {
    try {
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      // Each token is of `0.001` ether. The value to send is `0.001 * amount`
      const value = utils.parseEther((0.001 * amount).toString());
      console.log("testing: ", value.toString());
      const tx = await tokenContract.mint(amount, {
        value,
      });
      console.log("testing again");
      setLoading(true);

      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
   */
  const claimCryptoDevTokens = async () => {
    try {
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      const tx = await tokenContract.claim();
      setLoading(true);

      await tx.wait();
      setLoading(false);
      window.alert("Successfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getTotalTokensMinted: Retrieves how many tokens have been minted until time of invocation
   */
  const getTotalTokensMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getOwner: Gets the contract owner by connected address
   */
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      const _owner = await tokenContract.owner();
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const address = await signer.getAddress();

      if (address.toLowerCase() === _owner.toLowerCase()) setIsOwner(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * withdrawCoins: Withdraws ether by calling the withdraw function in the contract
   */
  const withdrawCoins = async () => {
    try {
      const signer = (await getProviderOrSigner(true)) as providers.JsonRpcSigner;
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);

      const tx = await tokenContract.withdraw();
      setLoading(true);

      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    if (!web3ModalRef.current) {
      throw new Error("web3ModalRef.current is undefined");
    }

    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Sepolia network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia");
      throw new Error("Change network to Sepolia");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /**
   * connectWallet: Connects MetaMask Wallet
   */
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
      getOwner();
    }
  }, [walletConnected]);

  /**
   * renderButton: Returns a button based on the state of the dApp
   */
  const renderButton = () => {
    if (loading) {
      return (
        <button className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center">
          Loading...
        </button>
      );
    }

    if (tokensToBeClaimed > BigNumber.from(zero)) {
      return (
        <>
          <div className="text-lg">{tokensToBeClaimed.toString()} Tokens can be claimed!</div>
          <button
            className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center"
            onClick={claimCryptoDevTokens}
          >
            Claim Tokens
          </button>
        </>
      );
    }

    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div className="flex flex-col">
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            onChange={(e) => setTokenAmount(parseInt(e.target.value))}
            className="w-56 h-full p-1 mb-2 shadow-md rounded-lg"
          />
        </div>

        <button
          className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center"
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <link
          rel="icon"
          href="/favicon.ico"
        />
      </Head>
      <div className="min-h-screen flex flex-row justify-center items-center font-mono">
        <div className="mx-8">
          <h1 className="text-4xl mb-2">Welcome to Crypto Devs ICO!</h1>
          <div className="text-lg">You can claim or mint Crypto Dev tokens here</div>
          {walletConnected ? (
            <div>
              <div className="text-lg">
                {/* Format Ether helps in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
              </div>
              <div className="text-lg">
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!
              </div>
              {renderButton()}
              {isOwner ? (
                <div>
                  {loading ? (
                    <button className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center">
                      Loading...
                    </button>
                  ) : (
                    <button
                      onClick={withdrawCoins}
                      className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center"
                    >
                      Withdraw Coins
                    </button>
                  )}
                </div>
              ) : (
                ""
              )}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="rounded bg-blue-700 border-none text-white text-base p-5 w-52 cursor-pointer mb-2 md:w-full md:flex md:flex-col md:justify-center md:items-center"
            >
              Connect Your Wallet
            </button>
          )}
        </div>
        <div>
          <img
            className="w-70 h-50 ml-20"
            src="./0.svg"
          />
        </div>
      </div>

      <footer className="flex justify-center items-center py-8 border-t-2 border-gray-300">
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
};

export default Home;
