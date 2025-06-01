import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import TranscriptionService from './TranscriptionService';
import GPTTranscriptionService from './GPTTranscriptionService';
import FileService from './FileService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
    try {
        console.log('Downloading and extracting audio files...');
        const fileService = new FileService();
        const audioPath = await fileService.downloadAndExtractAudio();
        console.log(`Audio files extracted to: ${audioPath}`);
        
        const transcriptionService = new TranscriptionService();
        await transcriptionService.transcribeAllAudioFiles(audioPath);
        
        // Wyślij transkrypcje do GPT
        const gptService = new GPTTranscriptionService();
        const streetName = await gptService.sendTranscriptionsToGPT();
        
        // Wyślij odpowiedź do Centrali
        await fileService.sendAnswer(streetName);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
