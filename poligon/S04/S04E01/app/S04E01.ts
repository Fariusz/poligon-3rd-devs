// Entry point for the episode
import * as dotenv from 'dotenv';
import * as path from 'path';
import { CentralaService } from './services/CentralaService';
import { PhotoService } from './services/PhotoService';
import { ImageRepairService } from './services/ImageRepairService';

// Load environment variables from the project root
dotenv.config({ path: path.join(__dirname, '../../../..', '.env') });

async function main() {
    try {
        const apiKey = process.env.PERSONAL_API_KEY!;
        
        // Initialize services
        const centralaService = new CentralaService(apiKey);
        const photoService = new PhotoService();
        const imageRepairService = new ImageRepairService(apiKey);
        
        console.log('=== BARBARA PHOTO ANALYSIS TASK ===');
        
        // Step 1: Get initial photo URLs from Centrala
        console.log('\n--- Step 1: Getting photo URLs ---');
        const imageUrls = await centralaService.getPhotoUrls();
        console.log('Found image URLs:', imageUrls);
        
        if (imageUrls.length === 0) {
            console.log('No image URLs found. Exiting.');
            return;
        }
        
        // Extract filenames for repair operations
        const filenames = centralaService.extractFilenamesFromUrls(imageUrls);
        console.log('Extracted filenames:', filenames);
        
        // Step 2: Process each image iteratively to improve quality
        console.log('\n--- Step 2: Iterative Image Repair ---');
        const processedImages = await imageRepairService.processMultipleImages(filenames);
        
        // Log repair results
        for (const processed of processedImages) {
            console.log(`${processed.originalFilename} -> ${processed.finalFilename} (${processed.operations.length} operations)`);
        }
        
        // Step 3: Create detailed description of Barbara from processed images
        console.log('\n--- Step 3: Creating Barbara Description ---');
        const imagesToAnalyze = processedImages.map(p => ({
            url: p.finalUrl,
            filename: p.finalFilename
        }));
        
        const descriptionResult = await photoService.createBarbaraDescription(imagesToAnalyze);
        
        console.log(`Generated description from ${descriptionResult.photosAnalyzed} photos`);
        console.log(`Confidence: ${descriptionResult.confidence}%`);
        console.log('Barbara description:', descriptionResult.description);
        
        // Step 4: Send description to Centrala and handle feedback
        console.log('\n--- Step 4: Sending Final Report ---');
        let currentDescription = descriptionResult.description;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`\nAttempt ${attempts}: Sending description to Centrala...`);
            
            const response = await centralaService.reportDescription(currentDescription);
            
            if (response.code === 0) {
                console.log('✅ SUCCESS! Barbara description accepted by Centrala');
                console.log('Final response:', response.message);
                break;
            } else if (response.hints && response.hints.length > 0) {
                console.log('❌ Description rejected. Received hints:', response.hints);
                
                if (attempts < maxAttempts) {
                    console.log('Improving description based on hints...');
                    currentDescription = await photoService.improveDescriptionWithHints(
                        currentDescription, 
                        response.hints
                    );
                    console.log('Improved description:', currentDescription);
                } else {
                    console.log('Max attempts reached. Final description:', currentDescription);
                }
            } else {
                console.log('❌ Description rejected without hints:', response.message);
                break;
            }
        }
        
        console.log('\n=== TASK COMPLETED ===');
        
    } catch (error: any) {
        console.error('Error during execution:', error);
        if (error.response?.data?.hints) {
            console.log('Hints from API:', error.response.data.hints);
        }
    }
}

main();