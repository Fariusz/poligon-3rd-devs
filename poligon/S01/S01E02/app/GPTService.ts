import { LLMService, Message as LLMMessage, Model } from '@shared/LLMService';
import { Memory } from './MemoryService';
import * as fs from 'fs';
import * as path from 'path';

export class GPTService {
    private llmService: LLMService;
    private systemPrompt: string;
    private robotKnowledge: string;

    constructor() {
        this.systemPrompt = fs.readFileSync(path.join(__dirname, '../data/prompts/system_prompt.txt'), 'utf-8');
        this.robotKnowledge = fs.readFileSync(path.join(__dirname, '../data/prompts/robot_knowledge.txt'), 'utf-8');
        this.llmService = new LLMService('', Model.GPT4_MINI);
    }

    async getAnswer(question: string, memories: Memory[]): Promise<string> {
        try {
            const memoryContext = memories
                .filter(m => !m.isQuestion)
                .map(m => m.text)
                .join('\n');

            const fullSystemPrompt = this.systemPrompt
                .replace('{ROBOT_KNOWLEDGE}', this.robotKnowledge)
                .replace('{MEMORY_CONTEXT}', memoryContext);

            const messages: LLMMessage[] = [
                {
                    role: 'system',
                    content: fullSystemPrompt
                },
                {
                    role: 'user',
                    content: question
                }
            ];

            return this.llmService.send({ messages });
        } catch (error) {
            throw new Error(`Failed to get answer from GPT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 