// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TCGGame is Ownable {
    uint256 private _currentCardId;
    
    ERC20 public gameToken;
    
    struct Card {
        string name;
        string cardType;
        uint256 value;
        string ipfsHash;
        address[] previousOwners;
        uint256 createdAt;
        uint256 lastTransferAt;
        uint256 rarity;
        address currentOwner;
        bool exists;
    }
    
    mapping(uint256 => Card) public cards;
    
    mapping(address => uint256[]) public userCards;
    
    uint256 public constant MAX_CARDS_PER_USER = 15;
    uint256 public constant TRANSFER_COOLDOWN = 5 minutes;
    uint256 public constant CRITICAL_ACTION_LOCK = 10 minutes;
    
    mapping(address => uint256) public lastTransferTime;
    mapping(address => uint256) public lastCriticalActionTime;
    
    uint256 public constant BOOSTER_PRICE = 100 * 10**18; // Les boosters coûtent 100 tokens
    
    event BoosterOpened(address indexed player, uint256[] cardIds);
    event CardBurned(address indexed player, uint256 cardId, uint256 tokenAmount);
    event CardTransferred(address indexed from, address indexed to, uint256 cardId);
    
    constructor(address _gameTokenAddress)  Ownable(msg.sender) {
        gameToken = ERC20(_gameTokenAddress);
    }
    
    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }
    
    // Ouverture d'un booster
    function openBooster() external {
        require(userCards[msg.sender].length + 3 <= MAX_CARDS_PER_USER, "Would exceed max cards limit");
        require(block.timestamp >= lastTransferTime[msg.sender] + TRANSFER_COOLDOWN, "Transfer cooldown active");
        require(gameToken.transferFrom(msg.sender, address(this), BOOSTER_PRICE), "Token transfer failed");
        
        uint256[] memory newCardIds = new uint256[](3);
        
        for(uint256 i = 0; i < 3; i++) {
            _currentCardId++;
            uint256 newCardId = _currentCardId;
            
            address[] memory previousOwners = new address[](1);
            previousOwners[0] = msg.sender;
            
            cards[newCardId] = Card({
                name: generateCardName(newCardId),
                cardType: generateCardType(newCardId),
                value: generateCardValue(newCardId),
                ipfsHash: generateIPFSHash(newCardId),
                previousOwners: previousOwners,
                createdAt: block.timestamp,
                lastTransferAt: block.timestamp,
                rarity: generateRarity(),
                currentOwner: msg.sender,
                exists: true
            });
            
            userCards[msg.sender].push(newCardId);
            newCardIds[i] = newCardId;
        }
        
        lastTransferTime[msg.sender] = block.timestamp;
        emit BoosterOpened(msg.sender, newCardIds);
    }
    
    // Fonction pour transférer une carte
    function transferCard(address to, uint256 cardId) external {
        require(cards[cardId].exists, "Card does not exist");
        require(cards[cardId].currentOwner == msg.sender, "Not card owner");
        require(userCards[to].length < MAX_CARDS_PER_USER, "Recipient would exceed max cards");
        require(block.timestamp >= lastTransferTime[msg.sender] + TRANSFER_COOLDOWN, "Transfer cooldown active");
        
        cards[cardId].currentOwner = to;
        cards[cardId].previousOwners.push(to);
        cards[cardId].lastTransferAt = block.timestamp;
        
        removeCardFromUser(msg.sender, cardId);
        userCards[to].push(cardId);
        
        lastTransferTime[msg.sender] = block.timestamp;
        emit CardTransferred(msg.sender, to, cardId);
    }
    
    // Fonction pour brûler une carte et recevoir une récompense selon la rareté
    function burnCard(uint256 cardId) external {
        require(cards[cardId].exists, "Card does not exist");
        require(cards[cardId].currentOwner == msg.sender, "Not card owner");
        require(block.timestamp >= lastCriticalActionTime[msg.sender] + CRITICAL_ACTION_LOCK, "Critical action lock active");
        
        uint256 tokenReward = calculateBurnReward(cards[cardId].rarity);
        
        // Brûler la carte
        removeCardFromUser(msg.sender, cardId);
        cards[cardId].exists = false;
        
        require(gameToken.transfer(msg.sender, tokenReward), "Reward transfer failed");
        
        lastCriticalActionTime[msg.sender] = block.timestamp;
        emit CardBurned(msg.sender, cardId, tokenReward);
    }
    
    // Fonction utilitaire pour retirer une carte d'un utilisateur
    function removeCardFromUser(address user, uint256 cardId) internal {
        uint256[] storage userCardsList = userCards[user];
        for (uint256 i = 0; i < userCardsList.length; i++) {
            if (userCardsList[i] == cardId) {
                userCardsList[i] = userCardsList[userCardsList.length - 1];
                userCardsList.pop();
                break;
            }
        }
    }
    
    function generateCardName(uint256 seed) internal pure returns (string memory) {
        return string(abi.encodePacked("Card #", toString(seed)));
    }
    
    function generateCardType(uint256 seed) internal pure returns (string memory) {
        return "Standard";
    }
    
    function generateCardValue(uint256 seed) internal pure returns (uint256) {
        return seed * 10;
    }
    
    function generateIPFSHash(uint256 seed) internal pure returns (string memory) {
        return "QmHash...";
    }
    
    // Rareté aléatoire 
    function generateRarity() internal view returns (uint256) {
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;
        if (rand < 60) return 1;
        if (rand < 90) return 2;
        return 3;
    }
    
    // Récompense selon la rareté
    function calculateBurnReward(uint256 rarity) internal pure returns (uint256) {
        if (rarity == 1) return 30 * 10**18;
        if (rarity == 2) return 60 * 10**18;
        return 100 * 10**18;
    }
    
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}