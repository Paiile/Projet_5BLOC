const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TCGGameModule", (m) => {
    // Déploiement du token ERC20
    const token = m.contract("GameToken", ["TCG Token", "TCG"]);

    // Déploiement de TCGGame avec le token 
    const game = m.contract("TCGGame", [token]);

    //Déploiement de CardManager
    const cardsManager = m.contract("CardsManager");

    return {
        token,
        game,
        cardsManager
    };
});