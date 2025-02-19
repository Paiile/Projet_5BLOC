const { expect } = require("chai");
const { uploadCardImageToIPFS, getIPFSGatewayUrl } = require("../ipfs-service");
const fs = require('fs');
const path = require('path');

describe("IPFS Basic Tests", function () {
    this.timeout(30000);

    it("should upload test-image.png to IPFS", async function () {
        // Chemin vers l'image de test
        const imagePath = path.join(__dirname, 'test-assets/test-image.png');
        
        try {
            // Vérifier si le fichier existe
            if (!fs.existsSync(imagePath)) {
                throw new Error(`L'image n'existe pas au chemin: ${imagePath}`);
            }

            const imageBuffer = fs.readFileSync(imagePath);
            console.log("Image size:", imageBuffer.length, "bytes");
            
            // Upload vers IPFS
            const ipfsHash = await uploadCardImageToIPFS(imageBuffer);
            console.log("IPFS Hash:", ipfsHash);
            console.log("Gateway URL:", getIPFSGatewayUrl(ipfsHash));
            
            expect(ipfsHash).to.be.a('string');
            expect(ipfsHash).to.have.length.above(0);

            // Vérifier que l'image est accessible via la gateway
            console.log("Vous pouvez vérifier l'image à cette URL:", getIPFSGatewayUrl(ipfsHash));

        } catch (error) {
            console.error("Test failed:", error);
            throw error;
        }
    });
});