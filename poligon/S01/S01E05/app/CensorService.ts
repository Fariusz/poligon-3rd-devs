import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';

export class CensorService {
    private llmService: LLMService;

    constructor() {
        const promptPath = path.join(__dirname, 'prompts', 'censor_prompt.txt');
        const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
        this.llmService = new LLMService(systemPrompt, Model.GPT4_MINI);
    }

    async censorText(text: string): Promise<string> {
        try {
            return await this.llmService.sendMessage(text);
        } catch (error) {
            console.error('Error getting censored text from GPT:', error);
            throw error;
        }
    }
} 