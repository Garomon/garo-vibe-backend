import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

const WALLET_FILE = 'wallet-keypair.json';

try {
    if (fs.existsSync(WALLET_FILE)) {
        const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
        const keypair = Keypair.fromSecretKey(secretKey);
        // Print ONLY the address as requested
        console.log(keypair.publicKey.toBase58());
    } else {
        console.error("Error: Archivo wallet-keypair.json no encontrado.");
    }
} catch (e) {
    console.error("Error leyendo la wallet:", e);
}
