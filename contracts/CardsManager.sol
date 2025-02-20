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

    function removeCardType(uint256 index) public onlyOwner {
        require(index < cardTypes.length, "Index out of bounds");
        for (uint i = index; i < cardTypes.length - 1; i++) {
            cardTypes[i] = cardTypes[i + 1];
        }
        cardTypes.pop();
    }

    function removeCardType(string memory _type) public onlyOwner {
        uint index = cardTypes.length;
        for (uint i = 0; i < cardTypes.length; i++) {
            if (keccak256(abi.encodePacked(cardTypes[i])) == keccak256(abi.encodePacked(_type))) {
                index = i;
                break;
            }
        }

        require(index < cardTypes.length, "Card type not found");
        removeCardType(index);
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

    function removeCardName(uint256 index) public onlyOwner {
        require(index < cardNames.length, "Index out of bounds");
        for (uint i = index; i < cardNames.length - 1; i++) {
            cardNames[i] = cardNames[i + 1];
        }
        cardNames.pop();
    }

    function removeCardName(string memory name) public onlyOwner {
        uint index = cardNames.length;
        for (uint i = 0; i < cardNames.length; i++) {
            if (keccak256(abi.encodePacked(cardNames[i])) == keccak256(abi.encodePacked(name))) {
                index = i;
                break;
            }
        }

        require(index < cardNames.length, "Card name not found");
        removeCardName(index);
    }

    function getCardRarities() public view returns (string[] memory) {
        return cardRarities;
    }
}
