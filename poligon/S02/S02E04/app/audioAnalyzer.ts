import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

const ANALYZER_MODEL = Model.GPT4o;
const WORKING_NOTES_DIR = path.join(__dirname, '../data/working_notes');
const INPUT_DIR = path.join(WORKING_NOTES_DIR, 'input');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export class AudioAnalyzer {
    private llmService: LLMService;
    private openai: OpenAI;

    constructor() {
        this.llmService = new LLMService("", ANALYZER_MODEL);
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Ensure directories exist
        if (!fs.existsSync(WORKING_NOTES_DIR)) {
            fs.mkdirSync(WORKING_NOTES_DIR, { recursive: true });
        }
        if (!fs.existsSync(INPUT_DIR)) {
            fs.mkdirSync(INPUT_DIR, { recursive: true });
        }
    }

    private async transcribeAudio(filePath: string): Promise<string> {
        try {
            const audioFile = fs.createReadStream(filePath);
            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: Model.WHISPER,
                language: 'en'
            });
            return transcription.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw error;
        }
    }

    async analyzeAudio(filePath: string): Promise<string> {
        try {
            const transcription = await this.transcribeAudio(filePath);
            
            // Analyze the transcription using GPT-4
            const analysis = await this.llmService.sendMessage(
                transcription,
                "Zrób transkrypcję audio do tekstu",
                ANALYZER_MODEL
            );

            return analysis;
        } catch (error) {
            console.error('Error analyzing audio:', error);
            throw error;
        }
    }

    async analyzeAudioFiles(audioDir: string): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        
        try {
            if (!fs.existsSync(audioDir)) {
                throw new Error(`Audio directory not found at: ${audioDir}`);
            }

            const files = fs.readdirSync(audioDir);
            console.log(`Found ${files.length} files in audio directory`);
            
            for (const file of files) {
                if (file.endsWith('.mp3')) {
                    const filePath = path.join(audioDir, file);
                    console.log(`Analyzing audio file: ${file}`);
                    const analysis = await this.analyzeAudio(filePath);
                    results.set(file, analysis);
                }
            }

            // Save results to file
            this.saveResultsToFile(results);

            return results;
        } catch (error) {
            console.error('Error analyzing audio files:', error);
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