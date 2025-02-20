const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CardManager", function () {
    let CardsManager, cardManager, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        CardsManager = await ethers.getContractFactory("CardsManager");
        cardManager = await CardsManager.deploy();
        await cardManager.waitForDeployment();
    });

    describe("Nom des cartes", function () {
        it("Doit retourner la liste de noms initiale", async function () {
            expect(await cardManager.getCardNames()).to.deep.equals(["Pikachu", "Charmander", "Bulbasaur", "Squirtle", "Jigglypuff", "Mewtwo", "Mew", "Gengar", "Gyarados", "Dragonite"]);
        });

        it("Doit permettre d'ajouter un nom de carte", async function () {
            await cardManager.addCardName("Articuno");
            expect(await cardManager.getCardNames()).to.deep.equals(["Pikachu", "Charmander", "Bulbasaur", "Squirtle", "Jigglypuff", "Mewtwo", "Mew", "Gengar", "Gyarados", "Dragonite", "Articuno"]);
        });

        it("Doit permettre de supprimer un nom de carte par son nom", async function () {
            await cardManager["removeCardName(string)"]("Charmander");
            expect(await cardManager.getCardNames()).to.deep.equals(["Pikachu", "Bulbasaur", "Squirtle", "Jigglypuff", "Mewtwo", "Mew", "Gengar", "Gyarados", "Dragonite"]);
        });

        it("Doit permettre de supprimer un nom de carte par son index", async function () {
            await cardManager["removeCardName(uint256)"](1);
            expect(await cardManager.getCardNames()).to.deep.equals(["Pikachu", "Bulbasaur", "Squirtle", "Jigglypuff", "Mewtwo", "Mew", "Gengar", "Gyarados", "Dragonite"]);
        });

        it("Doit renvoyer une erreur si le nom de la carte n'existe pas", async function () {
            await expect(cardManager["removeCardName(string)"]("Missingno")).to.be.revertedWith("Card name not found");
        });

        it("Doit renvoyer une erreur si l'index de la carte n'existe pas", async function () {
            await expect(cardManager["removeCardName(uint256)"](100)).to.be.revertedWith("Index out of bounds");
        });
    })

    describe("Type des cartes", function () {
        it("Doit retourner la liste de types initiale", async function () {
            expect(await cardManager.getCardTypes()).to.deep.equals(["Standard", "Water", "Fire", "Grass", "Electric", "Psychic", "Fighting", "Dark", "Dragon", "Fairy"]);
        });

        it("Doit permettre d'ajouter un type de carte", async function () {
            await cardManager.addCardType("Ice");
            expect(await cardManager.getCardTypes()).to.deep.equals(["Standard", "Water", "Fire", "Grass", "Electric", "Psychic", "Fighting", "Dark", "Dragon", "Fairy", "Ice"]);
        });

        it("Doit permettre de supprimer un type de carte par son nom", async function () {
            await cardManager["removeCardType(string)"]("Water");
            expect(await cardManager.getCardTypes()).to.deep.equals(["Standard", "Fire", "Grass", "Electric", "Psychic", "Fighting", "Dark", "Dragon", "Fairy"]);
        });

        it("Doit permettre de supprimer un type de carte par son index", async function () {
            await cardManager["removeCardType(uint256)"](1);
            expect(await cardManager.getCardTypes()).to.deep.equals(["Standard", "Fire", "Grass", "Electric", "Psychic", "Fighting", "Dark", "Dragon", "Fairy"]);
        });

        it("Doit renvoyer une erreur si le type de carte n'existe pas", async function () {
            await expect(cardManager["removeCardType(string)"]("Bug")).to.be.revertedWith("Card type not found");
        });

        it("Doit renvoyer une erreur si l'index du type de carte n'existe pas", async function () {
            await expect(cardManager["removeCardType(uint256)"](100)).to.be.revertedWith("Index out of bounds");
        });
    });

    describe("Rareté des cartes", function () {
        it("Doit retourner la liste de raretés initiale", async function () {
            expect(await cardManager.getCardRarities()).to.deep.equals(["Common", "Uncommon", "Rare", "Epic", "Legendary"]);
        });
    });
});