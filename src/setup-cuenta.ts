import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import * as fs from 'fs';

const WALLET_FILE = 'wallet-keypair.json';

// === 1. Obtener o Crear Wallet ===
function obtenerWallet(): Keypair {
    if (fs.existsSync(WALLET_FILE)) {
        console.log("📂 Cargando wallet existente...");
        const secretKeyString = fs.readFileSync(WALLET_FILE, 'utf-8');
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        return Keypair.fromSecretKey(secretKey);
    } else {
        console.log("🆕 Creando nueva wallet...");
        const keypair = Keypair.generate();
        fs.writeFileSync(WALLET_FILE, JSON.stringify(Array.from(keypair.secretKey)));
        return keypair;
    }
}

// === 2. Verificar Saldo ===
async function verificarSaldo(connection: Connection, publicKey: any): Promise<number> {
    const saldo = await connection.getBalance(publicKey);
    const saldoSol = saldo / LAMPORTS_PER_SOL;
    console.log(`💰 Saldo actual: ${saldoSol} SOL`);
    return saldoSol;
}

// === 3. Solicitar Airdrop ===
async function solicitarAirdrop(connection: Connection, publicKey: any) {
    console.log("🪂 Solicitando Airdrop de 1 SOL...");
    const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);

    console.log("⏳ Confirmando transacción...");
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
    });
    console.log("✅ Airdrop confirmado!");
}

// === Ejecución Principal ===
async function main() {
    try {
        // Conexión a Devnet
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

        // 1. Obtener Wallet
        const wallet = obtenerWallet();
        console.log("🔑 Wallet Public Key:", wallet.publicKey.toBase58());

        // 2. Verificar Saldo
        let saldo = await verificarSaldo(connection, wallet.publicKey);

        // 3. Airdrop si es necesario
        if (saldo < 1) {
            await solicitarAirdrop(connection, wallet.publicKey);
            await verificarSaldo(connection, wallet.publicKey);
        } else {
            console.log("✅ Saldo suficiente, no se requiere airdrop.");
        }

    } catch (error) {
        console.error("❌ Error en la ejecución:", error);
    }
}

main();
