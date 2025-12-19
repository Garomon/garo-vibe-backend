import { Keypair } from "@solana/web3.js";

// 1. Generar un nuevo par de claves (Keypair)
const keypair = Keypair.generate();

// 2. Imprimir la "Public Key" (dirección de la wallet)
console.log("Public Key:", keypair.publicKey.toBase58());

// 3. Imprimir la "Secret Key" (llave privada) como array de números
console.log("Secret Key:", keypair.secretKey);
