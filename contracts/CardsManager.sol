// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CardsManager is Ownable {
    string[] public cardTypes;
    string[] public cardNames;
    string[] public cardRarities;

    constructor() Ownable(msg.sender) {
        cardTypes = ["Standard", "Water", "Fire", "Grass", "Electric", "Psychic", "Fighting", "Dark", "Dragon", "Fairy"];
        cardNames = ["Pikachu", "Charmander", "Bulbasaur", "Squirtle", "Jigglypuff", "Mewtwo", "Mew", "Gengar", "Gyarados", "Dragonite"];
        cardRarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
    }

    function getCardTypes() public view returns (string[] memory) {
        return cardTypes;
    }

    function addCardType(string memory newType) external onlyOwner {
        for (uint256 i = 0; i < cardTypes.length; i++) {
            require(keccak256(abi.encodePacked(cardTypes[i])) != keccak256(abi.encodePacked(newType)), "Card type already exists");
        }
        cardTypes.push(newType);
    }

    function removeCardType(uint256 index) external onlyOwner {
        require(index < cardTypes.length, "Index out of bounds");
        cardTypes[index] = cardTypes[cardTypes.length - 1];
        cardTypes.pop();
    }

    function getCardNames() public view returns (string[] memory) {
        return cardNames;
    }

    function addCardName(string memory newName) external onlyOwner {
        for (uint256 i = 0; i < cardNames.length; i++) {
            require(keccak256(abi.encodePacked(cardNames[i])) != keccak256(abi.encodePacked(newName)), "Card name already exists");
        }
        cardNames.push(newName);
    }

    function removeCardName(uint256 index) external onlyOwner {
        require(index < cardNames.length, "Index out of bounds");
        cardNames[index] = cardNames[cardNames.length - 1];
        cardNames.pop();
    }

    function getCardRarities() public view returns (string[] memory) {
        return cardRarities;
    }
}
