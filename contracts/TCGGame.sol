// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CardsManager.sol";

contract TCGGame is Ownable {
    uint256 private _currentCardId;
    
    ERC20 public gameToken;
    CardsManager public cardsManager;
    
    struct Card {
        string name;
        string cardType;
        uint256 value;
        string ipfsHash;
        address[] previousOwners;
        uint256 createdAt;
        uint256 lastTransferAt;
        string rarity;
        address currentOwner;
        bool exists;
    }

    mapping(uint256 => Card) public cards;
    
    mapping(address => uint256[]) public userCards;
    
    uint256 public constant MAX_CARDS_PER_USER = 15;
    uint16 public constant CARDS_PER_BOOSTER = 3;
    uint256 public constant TRANSFER_COOLDOWN = 5 minutes;
    uint256 public constant CRITICAL_ACTION_LOCK = 10 minutes;
    
    mapping(address => uint256) public lastTransferTime;
    mapping(address => uint256) public lastCriticalActionTime;
    
    uint256 public constant BOOSTER_PRICE = 100 * 10**18; // Les boosters coûtent 100 tokens
    
    event BoosterOpened(address indexed player, uint256[] cardIds);
    event CardBurned(address indexed player, uint256 cardId, uint256 tokenAmount);
    event CardTransferred(address indexed from, address indexed to, uint256 cardId);
    
    constructor(address _gameTokenAddress) Ownable(msg.sender) {
        gameToken = ERC20(_gameTokenAddress);
        cardsManager = new CardsManager();
    }
    
    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }
    
    // Ouverture d'un booster
    function openBooster() external {
        require(userCards[msg.sender].length + CARDS_PER_BOOSTER <= MAX_CARDS_PER_USER, "Would exceed max cards limit");
        require(block.timestamp >= lastTransferTime[msg.sender] + TRANSFER_COOLDOWN, "Transfer cooldown active");
        require(gameToken.transferFrom(msg.sender, address(this), BOOSTER_PRICE), "Token transfer failed");
        
        uint256[] memory newCardIds = new uint256[](CARDS_PER_BOOSTER);
        
        for(uint256 i = 0; i < CARDS_PER_BOOSTER; i++) {
            _currentCardId++;
            uint256 newCardId = _currentCardId;
            
            address[] memory previousOwners = new address[](1);
            previousOwners[0] = msg.sender;
            
            cards[newCardId] = Card({
                name: generateCardName(newCardId),
                cardType: generateCardType(newCardId),
                value: 0,
                ipfsHash: generateIPFSHash(newCardId),
                previousOwners: previousOwners,
                createdAt: block.timestamp,
                lastTransferAt: block.timestamp,
                rarity: generateRarity(),
                currentOwner: msg.sender,
                exists: true
            });

            setCardValue(cards[newCardId]);
            
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
        
        uint256 tokenReward = getBurnReward(cardId);

        require(gameToken.balanceOf(address(this)) >= tokenReward, "Contract does not have enough tokens");
        
        // Brûler la carte si le transfert fonctionne
        require(gameToken.transfer(msg.sender, tokenReward), "Reward transfer failed");
        removeCardFromUser(msg.sender, cardId);
        cards[cardId].exists = false;
        
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
    
    function generateCardName(uint256 seed) internal view returns (string memory) {
        string[] memory cardNames = cardsManager.getCardNames();
        uint256 index = uint256(keccak256(abi.encode(seed))) % cardNames.length;
        return cardNames[index];
    }
    
    function generateCardType(uint256 seed) internal view returns (string memory) {
        string[] memory cardTypes = cardsManager.getCardTypes();
        uint256 index = uint256(keccak256(abi.encode(seed))) % cardTypes.length;
        return cardTypes[index];
    }

    function setCardValue(Card memory card) internal view {
        card.value = generateCardValue(card.name, card.rarity, card.cardType);
    }
    
    function generateCardValue(string memory cardName, string memory cardRarity, string memory cardType) internal view returns (uint256) {
        string[] memory cardNames = cardsManager.getCardNames();
        string[] memory cardRarities = cardsManager.getCardRarities();
        string[] memory cardTypes = cardsManager.getCardTypes();
        uint256 cardNameIndex;
        uint256 cardRarityIndex;
        uint256 cardTypeIndex;
        
        for (uint256 i = 0; i < cardNames.length; i++) {
            if (keccak256(abi.encodePacked(cardNames[i])) == keccak256(abi.encodePacked(cardName))) {
                cardNameIndex = i;
                break;
            }
        }

        for (uint256 i = 0; i < cardRarities.length; i++) {
            if (keccak256(abi.encodePacked(cardRarities[i])) == keccak256(abi.encodePacked(cardRarity))) {
                cardRarityIndex = i;
                break;
            }
        }

        for (uint256 i = 0; i < cardTypes.length; i++) {
            if (keccak256(abi.encodePacked(cardTypes[i])) == keccak256(abi.encodePacked(cardType))) {
                cardTypeIndex = i;
                break;
            }
        }

        return (cardNameIndex + 1) * (cardRarityIndex + 1) * (cardTypeIndex + 1) * 10**18;
    }

    function getBurnReward(uint256 cardId) public view returns (uint256) {
        require(cards[cardId].exists, "Card does not exist");
        
        Card memory card = cards[cardId];
        uint256 cardValue = card.value;

        return cardValue;
    }
    
    function generateIPFSHash(uint256 seed) internal pure returns (string memory) {
        return string(abi.encodePacked("Qm", toString(seed)));
    }
    
    // Rareté aléatoire 
    function generateRarity() internal view returns (string memory) {
        uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;
        string[] memory cardRarities = cardsManager.getCardRarities();
        
        if (rand < 50) return cardRarities[0];
        if (rand < 70) return cardRarities[1];
        if (rand < 85) return cardRarities[2];
        if (rand < 95) return cardRarities[3];
        return cardRarities[4];
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