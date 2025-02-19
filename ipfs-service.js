const { create } = require('ipfs-http-client');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration du client IPFS
const ipfs = create({
    host: 'localhost',
    port: 5001,
    protocol: 'http'
});

// Fonction pour vérifier la connexion IPFS
async function checkIPFSConnection() {
    try {
        const version = await ipfs.version();
        console.log("Connected to IPFS version:", version.version);
        return true;
    } catch (error) {
        console.error("IPFS connection error:", error);
        return false;
    }
}

// Fonction pour télécharger les métadonnées de carte sur IPFS
async function uploadCardMetadataToIPFS(cardData) {
    try {
        const metadata = {
            name: cardData.name,
            description: `${cardData.rarity} ${cardData.cardType} card`,
            image: cardData.imageUrl,
            attributes: [
                { trait_type: "Type", value: cardData.cardType },
                { trait_type: "Rarity", value: cardData.rarity },
                { trait_type: "Value", value: cardData.value.toString() }
            ]
        };
        const metadataBuffer = Buffer.from(JSON.stringify(metadata));
        const result = await ipfs.add(metadataBuffer);
        return result.cid.toString();
    } catch (error) {
        console.error("Erreur de téléversement vers IPFS:", error);
        throw error;
    }
}

// Fonction pour télécharger sur IPFS
async function uploadCardImageToIPFS(imageBuffer) {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'test-image.png',
            contentType: 'image/png'
        });

        const response = await fetch('http://localhost:5001/api/v0/add', {
            method: 'POST',
            headers: formData.getHeaders(),
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
        }

        const data = await response.json();
        return data.Hash;
    } catch (error) {
        console.error("Erreur détaillée de l'upload:", error);
        throw error;
    }
}

// Fonction pour récupérer depuis IPFS
async function getCardMetadataFromIPFS(ipfsHash) {
    try {
        let content = '';
        for await (const chunk of ipfs.cat(ipfsHash)) {
            content += chunk.toString();
        }
        return JSON.parse(content);
    } catch (error) {
        console.error("Erreur de récupération depuis IPFS:", error);
        throw error;
    }
}

// Fonction pour obtenir l'URL passerelle IPFS avec plusieurs alternatives
function getIPFSGatewayUrl(ipfsHash) {
    const gateways = [
        `http://localhost:8080/ipfs/${ipfsHash}`,  // Gateway locale
        `https://ipfs.io/ipfs/${ipfsHash}`,        // Gateway publique principale
    ];
    return gateways[0]; // Retourne la gateway locale par défaut
}

// Fonction pour vérifier l'accessibilité d'une gateway
async function checkGatewayAccess(ipfsHash) {
    const gateways = [
        `http://localhost:8080/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
    ];

    for (const gateway of gateways) {
        try {
            const response = await fetch(gateway, { timeout: 5000 });
            if (response.ok) {
                return gateway;
            }
        } catch (error) {
            console.log(`Gateway non accessible: ${gateway}`);
        }
    }
    return null;
}

async function uploadCardWithMetadata(cardData, imagePath) {
    try {
        // 1. Lire l'image
        const imageBuffer = fs.readFileSync(imagePath);
        
        // 2. Upload l'image sur IPFS
        const imageFormData = new FormData();
        imageFormData.append('file', imageBuffer, {
            filename: path.basename(imagePath),
            contentType: 'image/jpeg'
        });
        
        const imageResponse = await fetch('http://localhost:5001/api/v0/add', {
            method: 'POST',
            headers: imageFormData.getHeaders(),
            body: imageFormData
        });

        if (!imageResponse.ok) {
            throw new Error(`Failed to upload image: ${await imageResponse.text()}`);
        }

        const imageData = await imageResponse.json();
        const imageHash = imageData.Hash;

        // 3. Créer et upload les métadonnées
        const metadata = {
            name: cardData.name,
            description: `${cardData.rarity} ${cardData.cardType} card`,
            image: `ipfs://${imageHash}`,
            attributes: [
                { trait_type: "Type", value: cardData.cardType },
                { trait_type: "Rarity", value: cardData.rarity },
                { trait_type: "Value", value: cardData.value.toString() }
            ]
        };

        const metadataBuffer = Buffer.from(JSON.stringify(metadata));
        const metadataFormData = new FormData();
        metadataFormData.append('file', metadataBuffer, {
            filename: 'metadata.json',
            contentType: 'application/json'
        });

        const metadataResponse = await fetch('http://localhost:5001/api/v0/add', {
            method: 'POST',
            headers: metadataFormData.getHeaders(),
            body: metadataFormData
        });

        if (!metadataResponse.ok) {
            throw new Error(`Failed to upload metadata: ${await metadataResponse.text()}`);
        }

        const metadataData = await metadataResponse.json();
        return {
            metadataHash: metadataData.Hash,
            imageHash: imageHash,
            metadata: metadata
        };
    } catch (error) {
        console.error("Erreur lors de l'upload de la carte:", error);
        throw error;
    }
}

module.exports = {
    uploadCardMetadataToIPFS,
    uploadCardImageToIPFS,
    getCardMetadataFromIPFS,
    getIPFSGatewayUrl,
    checkIPFSConnection,
    ipfs,
    checkGatewayAccess,
    uploadCardWithMetadata
};