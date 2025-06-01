import OpenAI from 'openai';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import sharp from 'sharp';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in .env file');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

export async function generateImage(description: string): Promise<string> {
    try {
        const promptPath = path.join(__dirname, '../data/prompts/image_generator_prompt.txt');
        const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
        const prompt = promptTemplate.replace('{description}', description);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
        });

        if (!response.data || response.data.length === 0) {
            throw new Error('No image data in response');
        }

        const imageUrl = response.data[0].url;
        if (!imageUrl) {
            throw new Error('No image URL in response');
        }

        // Download the image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `robot_${timestamp}.png`;
        const outputPath = path.join(__dirname, '../data/images', filename);
        
        // Ensure the images directory exists
        const imagesDir = path.join(__dirname, '../data/images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Process image with sharp to ensure PNG format and correct dimensions
        await sharp(imageResponse.data)
            .resize(1024, 1024, {
                fit: 'fill',
                position: 'center'
            })
            .png()
            .toFile(outputPath);

        console.log(`Image saved as ${outputPath} (1024x1024 PNG)`);
        
        return imageUrl;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
} 