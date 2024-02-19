import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTMarketplaceABI from './contracts/NFTMarketplace.json';
import NFTMintDN404 from './contracts/NFTMintDN404.json';
import Web3 from 'web3';

function App() {
  const [signer, setSigner] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [marketplaceContract, setMarketplaceContract] = useState(null);
  const [listNFTData, setListNFTData] = useState({
    nftAddress: '',
    amount: 1,
    price: '0.0',
    deadline: 0, 
    signature: ''
  });
  const [cancelListingData, setCancelListingData] = useState({
    nftAddress: ''
  });
  const [buyNFTData, setBuyNFTData] = useState({
    nftAddress: '',
    fraction: 1,
    price: '0.0'
  });
  const [updateListingData, setUpdateListingData] = useState({
    nftAddress: '',
    newPrice: '0.0'
  });
  const marketplaceAddress = "0x0Abef8EDAC7A1be16F8A5595f71c14dc395A0773";
  const nftContractAddress = "0xd8E46D75B5f4b450534acA1804f1CfcbeDEA3772";
  const web3 = new Web3(window.ethereum);


  function getTimestampInSeconds() {
    // returns current timestamp in seconds
    return Math.floor(Date.now() / 1000);
  }

  const connectWallet = async () => {
    if(window.ethereum) {
      try {
        const accounts = await web3.eth.getAccounts();
        const account = accounts[0];
        console.log(account);
        const marketplaceContract = new web3.eth.Contract(NFTMarketplaceABI.abi, marketplaceAddress);
        const tokenContract = new web3.eth.Contract(NFTMintDN404.abi, nftContractAddress);
        setMarketplaceContract(marketplaceContract);
        setNftContract(tokenContract);
        setSigner(signer);
        setAccount(account);
        // Set default account 
        marketplaceContract.options.from = account;
        tokenContract.options.from = account;
      } catch (error) {
        console.error(error);
      }
    }
  }

  useEffect(() => {
    connectWallet();
  }, []);

  const listNFTWithPermit = async () => {
    try {
        const priceInWei = web3.utils.toWei(listNFTData.price, 'ether');
        const deadline = getTimestampInSeconds() + 84200;
        const nonces = await nftContract.methods.nonces(account).call();

        console.log(Number(nonces.toString()));

        // Prepare the message data for signing
        const msgData = JSON.stringify({
            types: {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                Permit: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' }
                ],
            },
            domain: {
                name: "ERC404Token",
                version: "1",
                chainId: 80001,
                verifyingContract: nftContractAddress
            },
            primaryType: "Permit",
            message: {
                owner: account,
                spender: marketplaceAddress,
                value: listNFTData.amount,
                nonce: Number(nonces.toString()), //you will get once you import the erc20permit contract
                deadline: deadline // future timestamp
            }
        });

        // Sign the message data
        const signature = await new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync(
                {
                    method: "eth_signTypedData_v4",
                    params: [account, msgData],
                    from: account
                },
                function(err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result.result);
                    }
                }
            );
        });

        // Extract r, s, and v components from the signature
        const {r, s, v} = await ethers.utils.splitSignature(signature);

        console.log(r, s, v);

        // Call permit function with the signature components
        await marketplaceContract.methods.listItemWithPermit(nftContractAddress, account, marketplaceAddress, listNFTData.amount, deadline, priceInWei, v, r, s).send();

    } catch (error) {
        console.error(error);
    }
};

  const cancelListing = async () => {
    try {
      await marketplaceContract.methods.cancelListing(cancelListingData.nftAddress);
    } catch (error) {
      console.error(error);
    }
  };

  const buyNFT = async () => {
    try {
      await marketplaceContract.methods.buyItem(
        buyNFTData.nftAddress, 
        buyNFTData.fraction
      )
      .send({ 
        from: account,
        value: web3.utils.toWei(buyNFTData.price, 'ether') 
    });
    } catch (error) {
      console.error(error);
    }
  };

  const updateListingPrice = async () => {
    try {
      await marketplaceContract.methods.updateListing(
        updateListingData.nftAddress,
        ethers.utils.parseEther(updateListingData.newPrice)
      );    
    } catch (error) {
      console.error(error);
    }
  };

  const getProceeds = async () => {
    try {
      await marketplaceContract.medthods.getProceeds(account);    
    } catch (error) {
      console.error(error);
    }
  };

  const getListings = async () => {
    try {
      await marketplaceContract.medthods.getListings(nftContractAddress);    
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      <div>Account: {account}</div>
      <hr />
      <div>
        <h2>List NFT with Permit</h2>
        <input
          type="text"
          placeholder="NFT Address"
          value={listNFTData.nftAddress}
          onChange={(e) => setListNFTData({ ...listNFTData, nftAddress: e.target.value })}
        />
        <input
          type="number"
          placeholder="Amount"
          value={listNFTData.amount}
          onChange={(e) => setListNFTData({ ...listNFTData, amount: parseInt(e.target.value) })}
        />
        <input
          type="text"
          placeholder="Price"
          value={listNFTData.price}
          onChange={(e) => setListNFTData({ ...listNFTData, price: e.target.value })}
        />
        <button onClick={listNFTWithPermit}>List NFT with Permit</button>
      </div>
      <hr />
      <div>
        <h2>Cancel Listing</h2>
        <input
          type="text"
          placeholder="NFT Address"
          value={cancelListingData.nftAddress}
          onChange={(e) => setCancelListingData({ ...cancelListingData, nftAddress: e.target.value })}
        />
        <button onClick={cancelListing}>Cancel Listing</button>
      </div>
      <hr />
      <div>
        <h2>Buy NFT</h2>
        <input
          type="text"
          placeholder="NFT Address"
          value={buyNFTData.nftAddress}
          onChange={(e) => setBuyNFTData({ ...buyNFTData, nftAddress: e.target.value })}
        />
        <input
          type="number"
          placeholder="Fraction"
          value={buyNFTData.fraction}
          onChange={(e) => setBuyNFTData({ ...buyNFTData, fraction: parseInt(e.target.value) })}
        />
        <input
          type="text"
          placeholder="Price"
          value={buyNFTData.price}
          onChange={(e) => setBuyNFTData({ ...buyNFTData, price: e.target.value })}
        />
        <button onClick={buyNFT}>Buy NFT</button>
      </div>
      <hr />
      <div>
        <h2>Update Listing Price</h2>
        <input
          type="text"
          placeholder="NFT Address"
          value={updateListingData.nftAddress}
          onChange={(e) => setUpdateListingData({ ...updateListingData, nftAddress: e.target.value })}
        />
        <input
          type="text"
          placeholder="New Price"
          value={updateListingData.newPrice}
          onChange={(e) => setUpdateListingData({ ...updateListingData, newPrice: e.target.value })}
        />
        <button onClick={updateListingPrice}>Update Listing Price</button>
      </div>
    </div>
  );
}

export default App;
