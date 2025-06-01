import { convertToBlackAndWhite } from "./imageProcessor";
import { splitMap } from "./mapSplitter";

async function main() {
    try {
        // Convert image to black and white
        await convertToBlackAndWhite('mapa.jpg', 'mapa_bw.jpg');
        
        // Split the black and white map into 4 parts
        await splitMap();
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
