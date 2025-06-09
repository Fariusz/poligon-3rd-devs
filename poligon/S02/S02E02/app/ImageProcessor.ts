import axios from 'axios';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export class ImageProcessor {
    
    async compressImageForAPI(imageBuffer: Buffer): Promise<Buffer> {
        try {
            // Compress and resize image to reduce token usage
            const compressedImage = await sharp(imageBuffer)
                .resize({ 
                    width: 800, 
                    height: 800, 
                    fit: 'inside',
                    withoutEnlargement: true 
                })
                .jpeg({ 
                    quality: 70,
                    progressive: true 
                })
                .toBuffer();
                
            console.log(`Original size: ${imageBuffer.length} bytes, Compressed: ${compressedImage.length} bytes`);
            return compressedImage;
        } catch (error) {
            console.error('Error compressing image:', error);
            // Return original buffer if compression fails
            return imageBuffer;
        }
    }

    async enhanceImageForOCR(imageBuffer: Buffer): Promise<Buffer> {
        try {
            // Enhance image for better text recognition
            const enhancedImage = await sharp(imageBuffer)
                .grayscale()
                .normalize()
                .sharpen()
                .jpeg({ quality: 95 })
                .toBuffer();
                
            return enhancedImage;
        } catch (error) {
            console.error('Error enhancing image:', error);
            // Return original buffer if enhancement fails
            return imageBuffer;
        }
    }

    async saveFragmentsToFiles(fragments: Buffer[]): Promise<void> {
        try {
            console.log('Saving fragments to files for inspection...');
            
            // Create fragments directory if it doesn't exist
            const fragmentsDir = path.join(__dirname, '../fragments');
            if (!fs.existsSync(fragmentsDir)) {
                fs.mkdirSync(fragmentsDir, { recursive: true });
            }
            
            // Save each fragment
            for (let i = 0; i < fragments.length; i++) {
                const fragmentPath = path.join(fragmentsDir, `fragment_${i + 1}.jpg`);
                fs.writeFileSync(fragmentPath, fragments[i]);
                console.log(`Saved fragment ${i + 1} to: ${fragmentPath}`);
            }
            
        } catch (error) {
            console.error('Error saving fragments:', error);
        }
    }
}