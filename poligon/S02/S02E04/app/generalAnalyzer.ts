import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';

const ANALYZER_MODEL = Model.GPT4_1;
const OUTPUT_DIR = path.join(__dirname, '../data/working_notes/output');

interface CategorizedFiles {
    people: string[];
    hardware: string[];
}

export class GeneralAnalyzer {
    private llmService: LLMService;
    private prompt: string;

    constructor() {
        const promptPath = path.join(__dirname, '../data/prompts/general_analyzer_prompt.txt');
        this.prompt = fs.readFileSync(promptPath, 'utf-8');
        this.llmService = new LLMService(this.prompt, ANALYZER_MODEL);

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
    }

    async categorizeContent(content: string): Promise<string> {
        try {
            const analysis = await this.llmService.sendMessage(
                content,
                this.prompt,
                ANALYZER_MODEL
            );

            console.log('Model response:', analysis);
            return analysis;
        } catch (error) {
            console.error('Error categorizing content:', error);
            throw error;
        }
    }

    async analyzeFiles(): Promise<CategorizedFiles> {
        const categorizedFiles: CategorizedFiles = {
            people: [],
            hardware: []
        };
        
        try {
            if (!fs.existsSync(OUTPUT_DIR)) {
                throw new Error(`Output directory not found at: ${OUTPUT_DIR}`);
            }

            const textResultsPath = path.join(OUTPUT_DIR, 'text_analysis_results.txt');
            if (!fs.existsSync(textResultsPath)) {
                throw new Error('text_analysis_results.txt not found in output directory');
            }

            console.log('Reading text analysis results...');
            const content = fs.readFileSync(textResultsPath, 'utf-8');
            console.log('Content:', content);
            
            const category = await this.categorizeContent(content);
            console.log('Model response:', category);

            try {
                // Parse the model's JSON response
                const modelResponse = JSON.parse(category);
                
                // Clean up filenames by removing prefixes and handling extensions
                const cleanFilename = (filename: string) => {
                    // Remove input_ or source_ prefix
                    let cleanName = filename.replace(/^(input_|source_)/, '');
                    
                    // Remove .txt extension for .png.txt and .mp3.txt files
                    if (cleanName.endsWith('.png.txt') || cleanName.endsWith('.mp3.txt')) {
                        return cleanName.replace('.txt', '');
                    }
                    
                    // Keep other filenames as is
                    return cleanName;
                };
                
                categorizedFiles.people = modelResponse.people.map(cleanFilename);
                categorizedFiles.hardware = modelResponse.hardware.map(cleanFilename);

                // Sort files alphabetically in each category
                categorizedFiles.people.sort();
                categorizedFiles.hardware.sort();

                // Remove duplicates
                categorizedFiles.people = [...new Set(categorizedFiles.people)];
                categorizedFiles.hardware = [...new Set(categorizedFiles.hardware)];

            } catch (parseError) {
                console.error('Error parsing model response:', parseError);
                throw parseError;
            }

            return categorizedFiles;
        } catch (error) {
            console.error('Error analyzing files:', error);
            throw error;
        }
    }
} 