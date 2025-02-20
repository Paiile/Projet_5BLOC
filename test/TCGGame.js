const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    uploadCardWithMetadata, 
    checkIPFSConnection 
  } = require("../ipfs-service");
  const fs = require("fs");
  const path = require("path");

describe("TCGGame", function () {
    let GameToken;
    let gameToken;
    let TCGGame;
    let game;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy GameToken first
        const GameToken = await ethers.getContractFactory("GameToken");
        gameToken = await GameToken.deploy("TCG Game Token", "TCGT");
        await gameToken.waitForDeployment();
        
        const tokenAddress = await gameToken.getAddress();

        // Deploy TCGGame with the token address
        const TCGGame = await ethers.getContractFactory("TCGGame");
        game = await TCGGame.deploy(tokenAddress);
        await game.waitForDeployment();

        // Deploy CardsManager
        const CardsManager = await ethers.getContractFactory("CardsManager");
        cardsManager = await CardsManager.deploy();
        await cardsManager.waitForDeployment();

        // Initial token distribution
        const amount = ethers.parseEther("1000");
        await gameToken.transfer(addr1.address, amount);
        await gameToken.transfer(addr2.address, amount);

        // Approve spending for the game contract
        const gameAddress = await game.getAddress();
        await gameToken.connect(addr1).approve(gameAddress, ethers.parseEther("10000"));
        await gameToken.connect(addr2).approve(gameAddress, ethers.parseEther("10000"));
    });

    describe("Ouverture de Booster", function () {
        it("Devrait permettre l'ouverture d'un booster et stocker les images sur IPFS", async function () {
            // Vérifier la connexion IPFS avant de commencer
            const ipfsConnected = await checkIPFSConnection();
            if (!ipfsConnected) {
              console.log("IPFS non disponible, test ignoré");
              this.skip();
            }
          
            // Ouvrir un booster
            const tx = await game.connect(addr1).openBooster();
            const receipt = await tx.wait();
          
            // Récupérer les cartes créées depuis l'événement
            const event = receipt.logs.find(log => {
              try {
                const parsedLog = game.interface.parseLog(log);
                return parsedLog.name === "BoosterOpened";
              } catch {
                return false;
              }
            });
          
            expect(event).to.not.be.undefined;
            const parsedEvent = game.interface.parseLog(event);
            const cardIds = parsedEvent.args.cardIds;
            expect(cardIds.length).to.equal(3);
          
            const imagePaths = [
              path.resolve(__dirname, "test-assets/noadkoko.jpeg"),
              path.resolve(__dirname, "test-assets/pikachu.jpeg"),
              path.resolve(__dirname, "test-assets/salameche.jpeg"),
            ];
          
            // Pour chaque carte créée, récupérer ses détails et ajouter son image à IPFS
            for (let i = 0; i < cardIds.length; i++) {
                const cardId = cardIds[i];
                const card = await game.cards(cardId);
                
                const cardData = {
                    name: card.name,
                    cardType: card.cardType,
                    rarity: card.rarity,
                    value: card.value.toString()
                };
          
                const result = await uploadCardWithMetadata(cardData, imagePaths[i]);
              
                await game.connect(addr1).setCardIPFSHash(cardId, result.metadataHash);
              
                const updatedCard = await game.cards(cardId);
                expect(updatedCard.ipfsHash).to.equal(result.metadataHash);
              
                // Afficher les liens IPFS dans la console
                console.log(`Carte #${cardId} - ${card.name} (${card.rarity}):`);
                console.log(`Métadonnées: http://localhost:8080/ipfs/${result.metadataHash}`);
                console.log(`Image: http://localhost:8080/ipfs/${result.imageHash}`);
            }
          
            // Vérifier que les cartes sont bien associées à l'utilisateur
            const userCards = await game.getUserCards(addr1.address);
            expect(userCards.length).to.equal(3);
          });

        it("Devrait échouer si pas assez de tokens", async function () {
            // First, remove all tokens from addr2
            const addr2Balance = await gameToken.balanceOf(addr2.address);
            await gameToken.connect(addr2).transfer(owner.address, addr2Balance);

            // Try to open booster without enough tokens
            await expect(
                game.connect(addr2).openBooster()
            ).to.be.reverted; // Use .to.be.reverted instead of .to.be.revertedWith
        });

        it("Devrait échouer si non approuvé", async function () {
            const gameAddress = await game.getAddress();
            // Set approval to 0
            await gameToken.connect(addr2).approve(gameAddress, 0);
            
            await expect(
                game.connect(addr2).openBooster()
            ).to.be.revertedWithCustomError(
                gameToken,
                "ERC20InsufficientAllowance"
            );
        });

        it("Devrait échouer si le nombre de cartes dépasse le maximum", async function () {
            // Ouvre des boosters pour atteindre le nombre maximum de cartes
            const boostersToOpen = await game.MAX_CARDS_PER_USER() / await game.CARDS_PER_BOOSTER();
            for (let i = 0; i < boostersToOpen; i++) {
                await game.connect(addr1).openBooster();
                await ethers.provider.send("evm_increaseTime", [300]); // 5 minutes
                await ethers.provider.send("evm_mine");
            }

            await expect(game.connect(addr1).openBooster()).to.be.revertedWith(
              "Would exceed max cards limit"
            );
        });

        it("Devrait échouer si le cooldown est toujours actif", async function () {
            // Active TRANSFERT_COOLDOWN
            await game.connect(addr1).openBooster();
            await expect(game.connect(addr1).openBooster()).to.be.revertedWith(
              "Transfer cooldown active"
            );
        });
    });

    describe("Transfert de Carte", function () {
        beforeEach(async function () {
            await game.connect(addr1).openBooster();
        });

        it("Devrait permettre le transfert d'une carte", async function () {
            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];

            await ethers.provider.send("evm_increaseTime", [300]); // 5 minutes
            await ethers.provider.send("evm_mine");

            await game.connect(addr1).transferCard(addr2.address, cardId);
            const newOwnerCards = await game.getUserCards(addr2.address);
            expect(newOwnerCards).to.include(cardId);
        });
        
        it("Devrait échouer si la carte n'existe pas", async function () {
            const cardId = 9999;
            await expect(
                game.connect(addr1).transferCard(addr2.address, cardId)
            ).to.be.revertedWith("Card does not exist");
        });

        it("Devrait échouer si non propriétaire", async function () {
            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];
            await expect(
                game.connect(addr2).transferCard(owner.address, cardId)
            ).to.be.revertedWith("Not card owner");
        });
        
        it("Devrait échouer si le destinataire atteint le nombre maximum de cartes", async function () {
            // Ouvre des boosters pour atteindre le nombre maximum de cartes
            const boostersToOpen = await game.MAX_CARDS_PER_USER() / await game.CARDS_PER_BOOSTER();
            for (let i = 0; i < boostersToOpen; i++) {
                await game.connect(addr2).openBooster();
                await ethers.provider.send("evm_increaseTime", [300]); // 5 minutes
                await ethers.provider.send("evm_mine");
            }

            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];
            await expect(
                game.connect(addr1).transferCard(addr2.address, cardId)
            ).to.be.revertedWith("Recipient would exceed max cards");
        });

        it("Devrait échouer si le cooldown est toujours actif", async function () {
            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];
            await expect(
              game.connect(addr1).transferCard(addr2.address, cardId)
            ).to.be.revertedWith("Transfer cooldown active");
        });
    });

    describe("Brûler une carte", function () {
        beforeEach(async function () {
            await game.connect(addr1).openBooster();
        });

        it("Devrait permettre de brûler une carte", async function () {
            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];

            await ethers.provider.send("evm_increaseTime", [300]); // 5 minutes
            await ethers.provider.send("evm_mine");

            await game.connect(addr1).burnCard(cardId);
            const newOwnerCards = await game.getUserCards(addr1.address);
            expect(newOwnerCards).to.not.include(cardId);
        });

        it("Devrait échouer si la carte n'existe pas", async function () {
            const cardId = 9999;
            await expect(
                game.connect(addr1).burnCard(cardId)
            ).to.be.revertedWith("Card does not exist");
        });

        it("Devrait échouer si non propriétaire", async function () {
            const userCards = await game.getUserCards(addr1.address);
            const cardId = userCards[0];
            await expect(
                game.connect(addr2).burnCard(cardId)
            ).to.be.revertedWith("Not card owner");
        });

        it("Devrait échouer si le cooldown est toujours actif", async function () {
            const userCards = await game.getUserCards(addr1.address);
            // Activate the cooldown for CRITICAL_ACTION_LOCK
            game.connect(addr1).burnCard(userCards[0]);
          await expect(
            game.connect(addr1).burnCard(userCards[1])
          ).to.be.revertedWith("Critical action lock active");
        });
        
        // it("Devrait échouer si le contrat n'a pas assez de tokens", async function () {
        //     const userCards = await game.getUserCards(addr1.address);
        //     const gameAddress = await game.getAddress();
            
        //     const ownerBalance = await gameToken.balanceOf(gameAddress);
    
        //     await gameToken.connect(owner).transfer(gameAddress, ownerBalance);
        //     const ownerBalance2 = await gameToken.balanceOf(owner.address);

        //     // Attendre que le CRITICAL_ACTION_LOCK soit passé
        //     await ethers.provider.send("evm_increaseTime", [600]); // 10 minutes
        //     await ethers.provider.send("evm_mine");
        //     console.log("OwnerToken", await gameToken.balanceOf(gameAddress));
        //     // Essayer de brûler une carte sans tokens dans le contrat
        //     await expect(
        //         game.connect(addr1).burnCard(userCards[0])
        //     ).to.be.revertedWith("Contract does not have enough tokens");
        // });
    });

    describe("Retrait d'ETH", function () {
        beforeEach(async function () {
            // Envoi d'ETH au contrat pour les tests
            await addr1.sendTransaction({
                to: await game.getAddress(),
                value: ethers.parseEther("1.0")
            });
        });

        it("Devrait permettre à l'owner de retirer les ETH", async function () {
            const gameAddress = await game.getAddress();
            const initialBalance = await ethers.provider.getBalance(gameAddress);
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await game.connect(owner).withdrawETH();
            await tx.wait();
            
            const finalBalance = await ethers.provider.getBalance(gameAddress);
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            expect(finalBalance).to.equal(0);
            expect(finalOwnerBalance).to.be.greaterThan(initialOwnerBalance);
        });
        
        it("Devrait échouer si appelé par un non-owner", async function () {
            await expect(
                game.connect(addr1).withdrawETH()
            ).to.be.revertedWithCustomError(
                game,
                "OwnableUnauthorizedAccount"
            );
        });
        
        it("Devrait échouer s'il n'y a pas d'ETH à retirer", async function () {
            // D'abord retirer tout l'ETH
            await game.connect(owner).withdrawETH();
            
            // Essayer de retirer à nouveau
            await expect(
                game.connect(owner).withdrawETH()
            ).to.be.revertedWith("No ETH to withdraw");
        });
    });
});