import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, fetchTreeConfigFromSeeds } from '@metaplex-foundation/mpl-bubblegum';
import { publicKey } from '@metaplex-foundation/umi';
import * as fs from 'fs';

const TREE_FILE = 'tree-address.txt';

async function main() {
    try {
        const umi = createUmi('https://api.devnet.solana.com').use(mplBubblegum());

        const treeAddress = fs.readFileSync(TREE_FILE, 'utf-8').trim();
        console.log("Tree Address:", treeAddress);
        const merkleTreePK = publicKey(treeAddress);

        console.log("Fetching tree config...");
        const treeConfig = await fetchTreeConfigFromSeeds(umi, { merkleTree: merkleTreePK });

        console.log("=== Tree Config ===");
        console.log("Num Minted:", treeConfig.numMinted);
        console.log("Capacity:", treeConfig.totalMintCapacity);
        console.log("Is Public:", treeConfig.isPublic);

    } catch (error) {
        console.error("Error fetching tree:", error);
    }
}

main();
