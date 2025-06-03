import * as fs from 'fs';
import * as path from 'path';
import { Model } from '../../../shared/LLMService';
import { estimateTokens, chunkText, getModelTokenLimit } from './tokenManager';

const DATA_DIR = path.join(__dirname, '../data');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');
const TEXT_DIR = path.join(PROCESSED_DIR, 'text');
const IMAGES_DIR = path.join(PROCESSED_DIR, 'images');
const AUDIO_DIR = path.join(PROCESSED_DIR, 'audio');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function combineContent(): Promise<void> {
    try {
        // Read processed content
        const articleContent = fs.readFileSync(path.join(TEXT_DIR, 'article.md'), 'utf-8');
        
        // Read image descriptions
        const imageFiles = fs.readdirSync(IMAGES_DIR)
            .filter(file => file.endsWith('.txt'));
        
        const imageDescriptions = imageFiles.map(file => {
            const content = fs.readFileSync(path.join(IMAGES_DIR, file), 'utf-8');
            return `## Image: ${file.replace('.txt', '')}\n${content}\n`;
        }).join('\n');
        
        // Read audio transcriptions
        const audioFiles = fs.readdirSync(AUDIO_DIR)
            .filter(file => file.endsWith('.txt'));
        
        const audioTranscriptions = audioFiles.map(file => {
            const content = fs.readFileSync(path.join(AUDIO_DIR, file), 'utf-8');
            return `## Audio: ${file.replace('.txt', '')}\n${content}\n`;
        }).join('\n');
        
        // Get model token limit
        const modelLimit = getModelTokenLimit(Model.GPT4_MINI);
        
        // Combine all content
        const combinedContent = [
            '# Article Content\n',
            articleContent,
            '\n# Image Descriptions\n',
            imageDescriptions,
            '\n# Audio Transcriptions\n',
            audioTranscriptions
        ].join('\n');
        
        // Check if content needs to be chunked
        const totalTokens = estimateTokens(combinedContent);
        if (totalTokens > modelLimit) {
            console.log(`Content exceeds token limit (${totalTokens} > ${modelLimit}). Chunking content...`);
            
            // Split content into chunks
            const chunks = chunkText(combinedContent, modelLimit);
            
            // Save each chunk
            chunks.forEach((chunk, index) => {
                const outputPath = path.join(OUTPUT_DIR, `combined_content_${index + 1}.md`);
                fs.writeFileSync(outputPath, chunk);
            });
            
            // Create index file
            const indexContent = chunks.map((_, index) => 
                `[Part ${index + 1}](combined_content_${index + 1}.md)`
            ).join('\n');
            
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'combined_content_index.md'),
                `# Content Parts\n\n${indexContent}`
            );
            
            console.log(`Content split into ${chunks.length} parts`);
        } else {
            // Save as single file
            const outputPath = path.join(OUTPUT_DIR, 'combined_content.md');
            fs.writeFileSync(outputPath, combinedContent);
            console.log('Content combined and saved successfully!');
        }
    } catch (error) {
        console.error('Error combining content:', error);
        throw error;
    }
} 