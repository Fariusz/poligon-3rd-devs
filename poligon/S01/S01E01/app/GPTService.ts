import { LLMService, Message, Model } from '../../../shared/LLMService';

export class GPTService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService('Answer the questions with shortest possible answer.', Model.GPT4_MINI);
    }

    async getAnswer(question: string): Promise<string> {
        const messages: Message[] = [
            {
                role: 'user',
                content: question
            }
        ];
        return this.llmService.send({ messages });
    }
} 