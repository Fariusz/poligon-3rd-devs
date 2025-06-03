import * as fs from 'fs';
import * as path from 'path';
import { OpenAIService } from '../../../../sdk/OpenAIService';
import { toFile } from 'openai';

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const AUDIO_DIR = path.join(RAW_DIR, 'audio');
const PROCESSED_AUDIO_DIR = path.join(PROCESSED_DIR, 'audio');

// Create necessary directories
if (!fs.existsSync(PROCESSED_AUDIO_DIR)) {
    fs.mkdirSync(PROCESSED_AUDIO_DIR, { recursive: true });
}

export async function processAudio(): Promise<void> {
    try {
        // Initialize OpenAI service
        const openaiService = new OpenAIService();
        
        // Get all audio files
        const audioFiles = fs.readdirSync(AUDIO_DIR)
            .filter(file => file.endsWith('.mp3') || file.endsWith('.wav'));
        
        console.log(`Found ${audioFiles.length} audio files to process`);
        
        // Process each audio file
        for (const audioFile of audioFiles) {
            console.log(`Processing audio file: ${audioFile}`);
            
            const audioPath = path.join(AUDIO_DIR, audioFile);
            const outputPath = path.join(PROCESSED_AUDIO_DIR, `${path.parse(audioFile).name}.txt`);
            
            // Check if we already have a processed version
            if (fs.existsSync(outputPath)) {
                console.log(`Skipping ${audioFile} - already processed`);
                continue;
            }
            
            try {
                // Read audio file
                const audioData = fs.readFileSync(audioPath);
                
                // Transcribe audio using OpenAI service
                const transcription = await openaiService.transcribe(audioData);
                
                // Save transcription
                fs.writeFileSync(outputPath, transcription);
                console.log(`Transcription saved to: ${outputPath}`);
            } catch (error) {
                console.error(`Error processing ${audioFile}:`, error);
            }
        }
        
        console.log('Audio processing completed!');
    } catch (error) {
        console.error('Error in processAudio:', error);
        throw error;
    }
} 