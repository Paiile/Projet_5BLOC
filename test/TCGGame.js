const { expect } = require("chai");
const { ethers } = require("hardhat");

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
        it("Devrait permettre l'ouverture d'un booster", async function () {
            const tx = await game.connect(addr1).openBooster();
            const receipt = await tx.wait();

            const gameAddress = await game.getAddress();
            const event = receipt.logs.find(log => {
                try {
                    const parsedLog = game.interface.parseLog(log);
                    return parsedLog.name === "BoosterOpened";
                } catch {
                    return false;
                }
            });
            expect(event).to.not.be.undefined;

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
    });
});