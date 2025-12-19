import express from 'express';
import cors from 'cors';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity, createSignerFromKeypair, publicKey, none } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
// Configuration
const PORT = process.env.PORT || 3000;
const WALLET_FILE = 'wallet-keypair.json';
const TREE_FILE = 'tree-address.txt';

// Initialize App
const app = express();
app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON body parsing

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, '../public')));

// --- Global Umi Setup ---
function getUmi() {
    const umi = createUmi('https://api.devnet.solana.com').use(mplBubblegum());

    let secretKey: Uint8Array;
    if (process.env.WALLET_SECRET_KEY) {
        try {
            // Try parsing as JSON array
            secretKey = Uint8Array.from(JSON.parse(process.env.WALLET_SECRET_KEY));
        } catch (e) {
            console.error("Error parsing WALLET_SECRET_KEY from env:", e);
            throw new Error("Invalid WALLET_SECRET_KEY format in environment variables");
        }
    } else {
        if (!fs.existsSync(WALLET_FILE)) throw new Error("Wallet file not found and WALLET_SECRET_KEY not set");
        secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
    }

    const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const mySigner = createSignerFromKeypair(umi, myKeypair);
    umi.use(keypairIdentity(mySigner));

    let treeAddress: string;
    if (process.env.TREE_ADDRESS) {
        treeAddress = process.env.TREE_ADDRESS;
    } else {
        if (!fs.existsSync(TREE_FILE)) throw new Error("Tree address file not found");
        treeAddress = fs.readFileSync(TREE_FILE, 'utf-8').trim();
    }

    const merkleTreePK = publicKey(treeAddress);

    return { umi, mySigner, merkleTreePK };
}

// --- Endpoints ---

// 1. Status Endpoint
app.get('/status', (req, res) => {
    res.send("El servidor de GΛRO VIBE está activo 🟢");
});

// 2. Mint Endpoint
app.post('/mint', async (req, res) => {
    console.log("📩 Petición de minteo recibida...");

    // Check if a specific receiver was requested
    const { receiverAddress } = req.body;

    try {
        const { umi, mySigner, merkleTreePK } = getUmi();

        // Determine who gets the NFT
        let targetOwner = mySigner.publicKey;
        if (receiverAddress) {
            try {
                console.log("🎯 Receiver Address:", receiverAddress);
                targetOwner = publicKey(receiverAddress);
            } catch (e) {
                return res.status(400).json({ success: false, error: "Invalid Solana Address provided" });
            }
        }

        console.log("🌳 Usando Merkle Tree:", merkleTreePK);
        console.log("👤 Minteando para:", targetOwner);

        // Minting Logic
        const { signature } = await mintV1(umi, {
            leafOwner: targetOwner,
            merkleTree: merkleTreePK,
            metadata: {
                name: "GΛRO Genesis Rave",
                symbol: "VIBE",
                uri: "https://ipfs.io/ipfs/bafkreicf2uskmsrm7sgqvy7hmign255iedvab4x5s5q4vxe2mcluc7yvhm",
                sellerFeeBasisPoints: 500, // 5%
                collection: none(),
                creators: [
                    { address: mySigner.publicKey, verified: false, share: 100 }
                ],
            },
        }).sendAndConfirm(umi);

        // Result Parsing
        const sigString = require('@metaplex-foundation/umi').base58.deserialize(signature)[0];
        console.log("✅ Minteo exitoso! Signature:", sigString);

        res.json({
            success: true,
            message: "NFT Minteado Exitosamente",
            recipient: targetOwner,
            signature: sigString,
            explorer: `https://explorer.solana.com/tx/${sigString}?cluster=devnet`
        });

    } catch (error: any) {
        console.error("❌ Error en el endpoint /mint:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Error desconocido al mintear"
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`👉 UI   http://localhost:${PORT}/`);
    console.log(`👉 API  http://localhost:${PORT}/status`);
});
