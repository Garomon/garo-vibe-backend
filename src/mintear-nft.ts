import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    mplBubblegum,
    mintV1
} from '@metaplex-foundation/mpl-bubblegum';
import {
    keypairIdentity,
    createSignerFromKeypair,
    publicKey,
    none
} from '@metaplex-foundation/umi';
import * as fs from 'fs';

const WALLET_FILE = 'wallet-keypair.json';
const TREE_FILE = 'tree-address.txt';

async function main() {
    try {
        const umi = createUmi('https://api.devnet.solana.com').use(mplBubblegum());

        if (!fs.existsSync(WALLET_FILE)) throw new Error("Wallet file not found");
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
        const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
        const mySigner = createSignerFromKeypair(umi, myKeypair);
        umi.use(keypairIdentity(mySigner));

        if (!fs.existsSync(TREE_FILE)) throw new Error("Tree address file not found");
        const treeAddress = fs.readFileSync(TREE_FILE, 'utf-8').trim();
        const merkleTreePK = publicKey(treeAddress);

        console.log("🌳 Usando Merkle Tree:", treeAddress);
        console.log("👤 Minteando a:", mySigner.publicKey);

        console.log("⏳ Minteando Compressed NFT...");
        const { signature } = await mintV1(umi, {
            leafOwner: mySigner.publicKey,
            merkleTree: merkleTreePK,
            metadata: {
                name: "GARO Genesis Rave",
                symbol: "VIBE",
                uri: "https://ipfs.io/ipfs/bafkreicf2uskmsrm7sgqvy7hmign255iedvab4x5s5q4vxe2mcluc7yvhm",
                sellerFeeBasisPoints: 500,
                collection: none(),
                creators: [
                    { address: mySigner.publicKey, verified: false, share: 100 }
                ],
            },
        }).sendAndConfirm(umi);

        const sigString = require('@metaplex-foundation/umi').base58.deserialize(signature)[0];
        console.log("✅ NFT Minteado Exitosamente!");
        console.log("📜 Signature:", sigString);
        console.log(`🔎 Ver en Explorer: https://explorer.solana.com/tx/${sigString}?cluster=devnet`);
        console.log("💡 Nota: El 'Asset ID' lo puedes encontrar en los detalles de la transacción en el explorador (sección Token Balance / Events).");

    } catch (error) {
        console.error("❌ Error minteando NFT:", error);
    }
}

main();
