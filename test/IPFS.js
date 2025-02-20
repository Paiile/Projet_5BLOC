const { expect } = require("chai");
const fs = require('fs');
const path = require('path');
const { 
    uploadCardImageToIPFS, 
    getIPFSGatewayUrl,
    checkGatewayAccess
} = require("../ipfs-service");

describe("IPFS Image Upload Test", function () {
    this.timeout(60000); // Augmenter le timeout pour les gros fichiers

    it("Upload test-image.png", async function () {
        const imagePath = path.join(__dirname, 'test-assets', 'test-image.png');
        
        try {
            // Vérifier si l'image existe
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image non trouvée au chemin: ${imagePath}`);
            }

            // Lire l'image et afficher sa taille
            const imageBuffer = fs.readFileSync(imagePath);

            // Upload vers IPFS
            const ipfsHash = await uploadCardImageToIPFS(imageBuffer);
            
            // Afficher les résultats
            console.log('Upload réussi');
            console.log('IPFS Hash:', ipfsHash);
            
            // Vérifier les gateways disponibles
            const accessibleGateway = await checkGatewayAccess(ipfsHash);
            if (accessibleGateway) {
                console.log('Gateway accessible:', accessibleGateway);
            } else {
                console.log('Aucune gateway accessible immédiatement. Voici toutes les URLs à essayer plus tard:');
                console.log(getIPFSGatewayUrl(ipfsHash));
            }
            
            expect(ipfsHash).to.be.a('string');
            expect(ipfsHash).to.have.length.above(0);

            return ipfsHash;
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            throw error;
        }
    });
});