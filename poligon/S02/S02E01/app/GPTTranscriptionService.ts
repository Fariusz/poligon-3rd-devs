import * as fs from 'fs';
import * as path from 'path';
import { LLMService as SharedLLMService, Message, Model } from '../../../shared/LLMService';

class GPTTranscriptionService extends SharedLLMService {
    async sendTranscriptionsToGPT(): Promise<string> {
        const transcriptionsPath = path.join(__dirname, 'data/transcriptions', 'all_transcriptions.txt');
        const transcriptions = fs.readFileSync(transcriptionsPath, 'utf8');
        const promptPath = path.join(__dirname, 'data/prompts/prompt.txt');
        const prompt = fs.readFileSync(promptPath, 'utf8');

        try {
            console.log('Wysyłam zapytanie do GPT z promptem:', prompt);
            
            const messages: Message[] = [
                {
                    role: "system",
                    content: transcriptions
                },
                {
                    role: "user",
                    content: prompt
                }
            ];

            const response = await this.sendConversation(messages, Model.GPT4);
            console.log('Pełna odpowiedź GPT:', response);
            
            // Wyciągnięcie nazwy ulicy z odpowiedzi
            const streetMatch = response.match(/ulica\s+([^,\.]+)/i);
            const streetName = streetMatch ? streetMatch[1].trim() : 'Nie znaleziono nazwy ulicy';
            console.log('Wyciągnięta nazwa ulicy:', streetName);
            
            return streetName;
        } catch (error) {
            console.error('Błąd podczas wysyłania zapytania do GPT:', error);
            throw error;
        }
    }
}

export default GPTTranscriptionService; 