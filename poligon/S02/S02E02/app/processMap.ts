import sharp from 'sharp';
import path from 'path';

async function processMap() {
    const inputPath = path.join(__dirname, '../data/mapa.jpg');
    const outputPath = path.join(__dirname, '../data/mapa_bw.jpg');

    try {
        await sharp(inputPath)
            .grayscale() // Convert to grayscale
            .modulate({
                brightness: 1.1, // Slightly increase brightness
                lightness: 1.5   // Increase contrast through lightness
            })
            .threshold(128)     // Convert to pure black and white
            .toFile(outputPath);

        console.log('Map processed successfully!');
    } catch (error) {
        console.error('Error processing map:', error);
    }
}

processMap(); 