import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { generateSigner, keypairIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import * as fs from 'fs';

const WALLET_FILE = 'wallet-keypair.json';

async function main() {
    try {
        // 1. Configurar Umi y conectar a Devnet
        const umi = createUmi('https://api.devnet.solana.com').use(mplBubblegum());

        // 2. Cargar la wallet existente
        if (!fs.existsSync(WALLET_FILE)) {
            throw new Error("No se encontró wallet-keypair.json");
        }
        const secretKeyJson = JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8'));
        const secretKey = Uint8Array.from(secretKeyJson);

        // 3. Adaptar el Keypair para Umi
        const myKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
        const myKeypairSigner = createSignerFromKeypair(umi, myKeypair);
        umi.use(keypairIdentity(myKeypairSigner));

        console.log("🔑 Wallet cargada:", myKeypair.publicKey);

        // 4. Generar un Keypair para el Merkle Tree
        const merkleTree = generateSigner(umi);
        console.log("🌳 Generando nuevo Merkle Tree con dirección:", merkleTree.publicKey);

        // 5. Crear el árbol en la blockchain
        // maxDepth: 14, maxBufferSize: 64 -> Capacidad para 16,384 cNFTs
        console.log("⏳ Enviando transacción para crear el árbol...");
        const builder = await createTree(umi, {
            merkleTree,
            maxDepth: 14,
            maxBufferSize: 64,
        });

        await builder.sendAndConfirm(umi);

        // 6. Guardar la dirección del árbol
        console.log("✅ Árbol creado exitosamente!");
        console.log("Tree Address:", merkleTree.publicKey);

        fs.writeFileSync('tree-address.txt', merkleTree.publicKey);
        console.log("📝 Dirección guardada en 'tree-address.txt'");

    } catch (error) {
        console.error("❌ Error creando el árbol:", error);
    }
}

main();
