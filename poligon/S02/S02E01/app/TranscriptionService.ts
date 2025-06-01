import OpenAI, { toFile } from "openai";
import * as fs from 'fs';
import * as path from 'path';

class TranscriptionService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    async transcribe(audioBuffer: Buffer): Promise<string> {
        console.log("Transcribing audio...");
        
        const transcription = await this.openai.audio.transcriptions.create({
            file: await toFile(audioBuffer, 'speech.m4a', { type: 'audio/m4a' }),
            language: 'pl',
            model: 'whisper-1',
        });
        return transcription.text;
    }

    async transcribeAllAudioFiles(audioDir: string) {
        const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.m4a'));
        const transcriptionsDir = path.join(__dirname, 'transcriptions');
        if (!fs.existsSync(transcriptionsDir)) {
            fs.mkdirSync(transcriptionsDir);
        }
        for (const file of files) {
            const filePath = path.join(audioDir, file);
            const buffer = fs.readFileSync(filePath);
            console.log(`Transcribing: ${file}`);
            try {
                const transcription = await this.transcribe(buffer);
                console.log(`--- Transcription for ${file} ---`);
                console.log(transcription);
                console.log('---------------------------------\n');
                // Zapisz transkrypcję do pliku txt
                const txtFileName = file.replace(/\.[^/.]+$/, '.txt');
                const txtFilePath = path.join(transcriptionsDir, txtFileName);
                fs.writeFileSync(txtFilePath, transcription, 'utf8');
            } catch (err) {
                console.error(`Error transcribing ${file}:`, err);
            }
        }
        // Połącz wszystkie transkrypcje w jeden plik w tym samym katalogu
        await this.mergeTranscriptions(transcriptionsDir, path.join(transcriptionsDir, 'all_transcriptions.txt'));
    }

    async mergeTranscriptions(transcriptionsDir: string, outputFile: string) {
        const files = fs.readdirSync(transcriptionsDir).filter(f => f.endsWith('.txt'));
        let merged = '';
        for (const file of files) {
            const name = file.replace('.txt', '');
            const content = fs.readFileSync(path.join(transcriptionsDir, file), 'utf8');
            merged += `${name.charAt(0).toUpperCase() + name.slice(1)}:\n${content}\n\n`;
        }
        fs.writeFileSync(outputFile, merged, 'utf8');
        console.log(`Połączone transkrypcje zapisane do: ${outputFile}`);
    }
}

export default TranscriptionService; 