import { Connection, clusterApiUrl } from "@solana/web3.js";

async function conectar() {
    try {
        // Crear una conexión a devnet
        const connection = new Connection(clusterApiUrl('devnet'));

        // Obtener la versión de la red
        const version = await connection.getVersion();

        // Imprimir el resultado
        console.log("Conectado exitosamente a Solana Devnet. Versión de la red:", version);
    } catch (error) {
        console.error("Error conectando a la red:", error);
    }
}

conectar();
