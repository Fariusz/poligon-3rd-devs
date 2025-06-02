import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';

const ANALYZER_MODEL = Model.GPT4_1;
const WORKING_NOTES_DIR = path.join(__dirname, '../data/working_notes');
const INPUT_DIR = path.join(WORKING_NOTES_DIR, 'input');
const OUTPUT_DIR = path.join(WORKING_NOTES_DIR, 'output');

export class TextAnalyzer {
    private llmService: LLMService;
    private prompt: string;

    constructor() {
        const promptPath = path.join(__dirname, '../data/prompts/text_analyzer_prompt.txt');
        this.prompt = fs.readFileSync(promptPath, 'utf-8');
        this.llmService = new LLMService(this.prompt, ANALYZER_MODEL);

        // Ensure directories exist
        if (!fs.existsSync(WORKING_NOTES_DIR)) {
            fs.mkdirSync(WORKING_NOTES_DIR, { recursive: true });
        }
        if (!fs.existsSync(INPUT_DIR)) {
            fs.mkdirSync(INPUT_DIR, { recursive: true });
        }
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
    }

    private saveResultsToFile(results: Map<string, string>): void {
        const resultsPath = path.join(OUTPUT_DIR, 'text_analysis_results.txt');
        const formattedResults = JSON.stringify(
            Array.from(results.entries()).map(([filename, analysis]) => ({
                filename: filename,
                content: analysis
            })),
            null,
            2
        );
        
        fs.writeFileSync(resultsPath, formattedResults);
        console.log(`Text analysis results have been saved to: ${resultsPath}`);
    }

    async analyzeTextFile(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            
            const analysis = await this.llmService.sendMessage(
                content,
                this.prompt,
                ANALYZER_MODEL
            );

            return analysis;
        } catch (error) {
            console.error('Error analyzing text file:', error);
            throw error;
        }
    }

    async analyzeTextFiles(textDir: string): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        
        try {
            // Analyze files from source directory
            if (!fs.existsSync(textDir)) {
                throw new Error(`Source text directory not found at: ${textDir}`);
            }

            const sourceFiles = fs.readdirSync(textDir);
            console.log(`Found ${sourceFiles.length} files in source text directory`);
            
            for (const file of sourceFiles) {
                if (file.endsWith('.txt')) {
                    const filePath = path.join(textDir, file);
                    console.log(`Analyzing source file: ${file}`);
                    const analysis = await this.analyzeTextFile(filePath);
                    results.set(`source_${file}`, analysis);
                }
            }

            // Analyze files from input directory
            if (!fs.existsSync(INPUT_DIR)) {
                throw new Error(`Input directory not found at: ${INPUT_DIR}`);
            }

            const inputFiles = fs.readdirSync(INPUT_DIR);
            console.log(`Found ${inputFiles.length} files in input directory`);
            
            for (const file of inputFiles) {
                if (file.endsWith('.txt') && file !== 'text_analysis_results.txt') {
                    const filePath = path.join(INPUT_DIR, file);
                    console.log(`Analyzing input file: ${file}`);
                    const analysis = await this.analyzeTextFile(filePath);
                    results.set(`input_${file}`, analysis);
                }
            }

            // Save results to file in output directory
            this.saveResultsToFile(results);

            return results;
        } catch (error) {
            console.error('Error analyzing text files:', error);
            throw error;
        }
    }
} 