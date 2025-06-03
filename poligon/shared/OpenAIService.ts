import OpenAI from 'openai';
import { toFile } from 'openai';

export class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async transcribe(audioBuffer: Buffer): Promise<string> {
        console.log("Transcribing audio...");
        
        const transcription = await this.openai.audio.transcriptions.create({
            file: await toFile(audioBuffer, 'speech.mp3'),
            language: 'pl',
            model: 'whisper-1',
        });
        return transcription.text;
    }
} 