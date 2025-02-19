const { create } = require('ipfs-http-client');
const fetch = require('node-fetch');
const FormData = require('form-data');

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
        formData.append('path', imageBuffer);

        const response = await fetch('http://localhost:5001/api/v0/add?stream-channels=true', {
            method: 'POST',
            headers: {
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("IPFS Response:", data);
        return data.Hash;
    } catch (error) {
        console.error("Erreur détaillée:", error);
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

// Fonction pour obtenir l'URL passerelle IPFS
function getIPFSGatewayUrl(ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
}

module.exports = {
    uploadCardMetadataToIPFS,
    uploadCardImageToIPFS,
    getCardMetadataFromIPFS,
    getIPFSGatewayUrl,
    checkIPFSConnection,
    ipfs
};