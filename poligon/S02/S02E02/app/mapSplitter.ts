import { LLMService, Model } from '../../../shared/LLMService';
import * as fs from 'fs';
import * as path from 'path';

interface MapPart {
    part: number;
    image: string;
}

interface MapResponse {
    parts: MapPart[];
}

export async function splitMap() {
    const llmService = new LLMService();
    
    // Read the map file using relative path
    const mapPath = path.join(__dirname, '..', 'data', 'mapa_bw.jpg');
    const mapBuffer = fs.readFileSync(mapPath);
    const base64Image = mapBuffer.toString('base64');

    // Read the prompt template
    const promptPath = path.join(__dirname, '..', 'data', 'prompt.txt');
    const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
    
    // Replace the image placeholder with actual base64 image
    const message = promptTemplate.replace('{image}', base64Image);

    try {
        const response = await llmService.sendMessage(message, undefined, Model.GPT4);
        console.log('Map splitting response received');
        
        // Parse the JSON response
        const mapResponse: MapResponse = JSON.parse(response);
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save each part as a separate image
        for (const part of mapResponse.parts) {
            const imageBuffer = Buffer.from(part.image, 'base64');
            const outputPath = path.join(outputDir, `part_${part.part}.jpg`);
            fs.writeFileSync(outputPath, imageBuffer);
            console.log(`Saved part ${part.part} to ${outputPath}`);
        }
        
        console.log('All parts have been saved successfully');
    } catch (error) {
        console.error('Error processing map:', error);
        throw error;
    }
}

// Run the function
splitMap(); 