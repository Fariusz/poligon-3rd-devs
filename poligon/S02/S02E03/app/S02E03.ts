import { getRobotDescription } from './robotDescription';
import { generateImage } from './imageGenerator';
import { reportImageUrlToCentrala } from '../../../shared/centralaReporter';

async function main() {
    try {
        // First get the robot description
        const description = await getRobotDescription();
        
        // Then generate image using the description and store the URL
        const imageUrl = await generateImage(description);
        console.log('Generated image URL:', imageUrl);

        // Send the URL to Centrala
        await reportImageUrlToCentrala(imageUrl, "robotid");
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main().catch(console.error);
