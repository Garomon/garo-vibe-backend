import { Keypair } from "@solana/web3.js";
import * as fs from 'fs';

const WALLET_FILE = 'wallet-keypair.json';

function main() {
    if (fs.existsSync(WALLET_FILE)) {
        const secretKeyString = fs.readFileSync(WALLET_FILE, 'utf-8');
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        const keypair = Keypair.fromSecretKey(secretKey);

        console.log("=== Tu Dirección de Wallet (Public Key) ===");
        console.log(keypair.publicKey.toBase58());
        console.log("===========================================");
    } else {
        console.error("Error: No se encontró el archivo 'wallet-keypair.json'. Ejecuta 'setup-cuenta.ts' primero.");
    }
}

main();
