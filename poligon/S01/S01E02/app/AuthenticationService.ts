import axios from 'axios';
import { MemoryService, Message } from './MemoryService';
import { GPTService } from './GPTService';

export class AuthenticationService {
    private memoryService: MemoryService;
    private gptService: GPTService;

    constructor(memoryService: MemoryService) {
        this.memoryService = memoryService;
        this.gptService = new GPTService();
    }

    async handleAuthentication(): Promise<any> {
        try {
            // Step 1: Send initial "READY" message
            const initialMessage: Message = {
                text: "READY",
                msgID: "0"
            };
            
            const response = await axios.post('https://xyz.ag3nts.org/verify', initialMessage);
            await this.memoryService.saveMemory(initialMessage);
            
            // Step 2: Handle the question from the robot
            if (response.data && response.data.text && response.data.msgID) {
                await this.memoryService.saveMemory(response.data, true);
                this.memoryService.setCurrentMsgID(response.data.msgID);
                
                // Step 3: Get answer from GPT and send it
                const memories = await this.memoryService.getAllMemories();
                const answer = await this.gptService.getAnswer(response.data.text, memories);
                
                const answerMessage: Message = {
                    text: answer,
                    msgID: response.data.msgID
                };
                
                const answerResponse = await axios.post('https://xyz.ag3nts.org/verify', answerMessage);
                await this.memoryService.saveMemory(answerMessage, false, true);
                
                return answerResponse.data;
            }
            
            throw new Error('Invalid response format from server');
        } catch (error) {
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
} 