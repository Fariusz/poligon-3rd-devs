import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';

const ANALYZER_MODEL = Model.GPT4o;
const WORKING_NOTES_DIR = path.join(__dirname, '../data/working_notes');
const INPUT_DIR = path.join(WORKING_NOTES_DIR, 'input');

export class ImageAnalyzer {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService("", ANALYZER_MODEL);

        // Ensure directories exist
        if (!fs.existsSync(WORKING_NOTES_DIR)) {
            fs.mkdirSync(WORKING_NOTES_DIR, { recursive: true });
        }
        if (!fs.existsSync(INPUT_DIR)) {
            fs.mkdirSync(INPUT_DIR, { recursive: true });
        }
    }

    private async readImageAsBase64(filePath: string): Promise<string> {
        const imageBuffer = fs.readFileSync(filePath);
        return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    }

    private async analyzeImage(filePath: string): Promise<string> {
        try {
            const base64Image = await this.readImageAsBase64(filePath);
            
            const analysis = await this.llmService.sendMessage(
                `${base64Image}`,
                "Zwróć tekst który jest na obrazku.",
                ANALYZER_MODEL
            );

            return analysis;
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    async analyzeImages(imagesDir: string): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        
        try {
            if (!fs.existsSync(imagesDir)) {
                throw new Error(`Images directory not found at: ${imagesDir}`);
            }

            const files = fs.readdirSync(imagesDir);
            console.log(`Found ${files.length} files in images directory`);
            
            for (const file of files) {
                if (file.endsWith('.jpg') || file.endsWith('.png')) {
                    const filePath = path.join(imagesDir, file);
                    console.log(`Analyzing image file: ${file}`);
                    const analysis = await this.analyzeImage(filePath);
                    results.set(file, analysis);
                }
            }

            // Save results to file
            this.saveResultsToFile(results);

            return results;
        } catch (error) {
            console.error('Error analyzing image files:', error);
            throw error;
        }
    }

    private saveResultsToFile(results: Map<string, string>): void {
        try {
            // Ensure input directory exists
            if (!fs.existsSync(INPUT_DIR)) {
                fs.mkdirSync(INPUT_DIR, { recursive: true });
            }

            // Save each result in a separate file
            for (const [filename, content] of results.entries()) {
                // Keep original filename with extension
                const outputPath = path.join(INPUT_DIR, `${filename}.txt`);
                fs.writeFileSync(outputPath, content, 'utf-8');
                console.log(`Saved analysis for ${filename} to ${outputPath}`);
            }
        } catch (error) {
            console.error('Error saving results to file:', error);
            throw error;
        }
    }
} 