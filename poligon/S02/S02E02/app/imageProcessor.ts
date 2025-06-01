import sharp from 'sharp';
import path from 'path';

export async function convertToBlackAndWhite(inputFileName: string, outputFileName: string): Promise<void> {
    try {
        const inputPath = path.join(__dirname, '..', 'data', inputFileName);
        const outputPath = path.join(__dirname, '..', 'data', outputFileName);

        await sharp(inputPath)
            .threshold(128)
            .toFile(outputPath);

        console.log('Image successfully converted to black and white!');
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
} 