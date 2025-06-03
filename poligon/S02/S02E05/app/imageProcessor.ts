import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';
import * as cheerio from 'cheerio';
import { estimateTokens, truncateText, getModelTokenLimit } from './tokenManager';
import { hasCache, getCache, saveCache } from './cacheManager';

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const IMAGES_DIR = path.join(RAW_DIR, 'images');
const PROCESSED_IMAGES_DIR = path.join(PROCESSED_DIR, 'images');

// Create necessary directories
[PROCESSED_DIR, PROCESSED_IMAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

interface ImageContext {
    filename: string;
    caption?: string;
    altText?: string;
    surroundingText?: string;
}

async function getImageContexts(): Promise<ImageContext[]> {
    const articlePath = path.join(RAW_DIR, 'article.html');
    const html = fs.readFileSync(articlePath, 'utf-8');
    const $ = cheerio.load(html);
    
    const contexts: ImageContext[] = [];
    
    // Find all images and their context
    $('img').each((_, element) => {
        const img = $(element);
        const src = img.attr('src');
        if (!src) return;

        // Get image filename
        const filename = path.basename(src);
        
        // Get caption (could be in figcaption, parent figure, or nearby text)
        let caption = '';
        const figure = img.closest('figure');
        if (figure.length) {
            const figcaption = figure.find('figcaption');
            if (figcaption.length) {
                caption = figcaption.text().trim();
            }
        }
        
        // Get alt text
        const altText = img.attr('alt') || '';
        
        // Get surrounding text (previous and next paragraphs)
        let surroundingText = '';
        const prevParagraph = img.prev('p');
        const nextParagraph = img.next('p');
        
        if (prevParagraph.length) {
            surroundingText += prevParagraph.text().trim() + '\n\n';
        }
        if (nextParagraph.length) {
            surroundingText += nextParagraph.text().trim();
        }

        contexts.push({
            filename,
            caption,
            altText,
            surroundingText: surroundingText.trim()
        });
    });

    return contexts;
}

export async function processImages(): Promise<void> {
    try {
        // Get image contexts from HTML
        const imageContexts = await getImageContexts();
        console.log(`Found ${imageContexts.length} images to process`);

        // Initialize LLM service for image analysis
        const llmService = new LLMService(
            'You are a helpful assistant that analyzes images and provides detailed descriptions. ' +
            'Consider the surrounding context, captions, and alt text when analyzing the image. ' +
            'Focus on important details and maintain a professional tone.',
            Model.GPT4o
        );
        
        // Get model token limit
        const modelLimit = getModelTokenLimit(Model.GPT4o);

        // Process each image
        for (const context of imageContexts) {
            const imagePath = path.join(IMAGES_DIR, context.filename);
            if (!fs.existsSync(imagePath)) {
                console.log(`Skipping ${context.filename} - file not found`);
                continue;
            }

            console.log(`Processing image: ${context.filename}`);

            // Check if we have a cached result
            if (hasCache(imagePath, 'image')) {
                console.log(`Using cached result for ${context.filename}`);
                const cachedContent = getCache(imagePath, 'image');
                if (cachedContent) {
                    const descriptionPath = path.join(PROCESSED_IMAGES_DIR, `${context.filename}.txt`);
                    fs.writeFileSync(descriptionPath, cachedContent);
                    continue;
                }
            }

            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            // Create prompt with image and context
            const prompt = `Please analyze this image with the following context:
${context.caption ? `Caption: ${context.caption}\n` : ''}
${context.altText ? `Alt text: ${context.altText}\n` : ''}
${context.surroundingText ? `Surrounding text:\n${context.surroundingText}\n` : ''}
Please provide a detailed description that takes into account all this contextual information.`;

            // Check if prompt fits within token limit
            const promptTokens = estimateTokens(prompt);
            if (promptTokens > modelLimit) {
                console.log(`Prompt exceeds token limit (${promptTokens} > ${modelLimit}). Truncating context...`);
                const truncatedContext = truncateText(context.surroundingText || '', modelLimit - 200);
                const truncatedPrompt = `Please analyze this image with the following context:
${context.caption ? `Caption: ${context.caption}\n` : ''}
${context.altText ? `Alt text: ${context.altText}\n` : ''}
${truncatedContext ? `Surrounding text:\n${truncatedContext}\n` : ''}
Please provide a detailed description that takes into account all this contextual information.`;

                const response = await llmService.sendMessage(
                    `${truncatedPrompt}\ndata:image/jpeg;base64,${base64Image}`
                );
                const description = response.trim();

                // Save description with context
                const descriptionPath = path.join(PROCESSED_IMAGES_DIR, `${context.filename}.txt`);
                const fullDescription = [
                    context.caption ? `Caption: ${context.caption}` : null,
                    context.altText ? `Alt text: ${context.altText}` : null,
                    context.surroundingText ? `Surrounding text:\n${context.surroundingText}` : null,
                    `\nDescription:\n${description}`
                ].filter(Boolean).join('\n\n');
                
                fs.writeFileSync(descriptionPath, fullDescription);
                saveCache(imagePath, 'image', fullDescription);
            } else {
                const response = await llmService.sendMessage(
                    `${prompt}\ndata:image/jpeg;base64,${base64Image}`
                );
                const description = response.trim();

                // Save description with context
                const descriptionPath = path.join(PROCESSED_IMAGES_DIR, `${context.filename}.txt`);
                const fullDescription = [
                    context.caption ? `Caption: ${context.caption}` : null,
                    context.altText ? `Alt text: ${context.altText}` : null,
                    context.surroundingText ? `Surrounding text:\n${context.surroundingText}` : null,
                    `\nDescription:\n${description}`
                ].filter(Boolean).join('\n\n');
                
                fs.writeFileSync(descriptionPath, fullDescription);
                saveCache(imagePath, 'image', fullDescription);
            }
        }

        console.log('All images processed successfully!');
    } catch (error) {
        console.error('Error processing images:', error);
        throw error;
    }
} 