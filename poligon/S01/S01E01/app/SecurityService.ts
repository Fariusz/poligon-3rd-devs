import axios from 'axios';
import { GPTService } from './GPTService';
import { FlagService } from './FlagService';

export class SecurityService {
    private gptService: GPTService;
    private flagService: FlagService;

    constructor() {
        this.gptService = new GPTService();
        this.flagService = new FlagService();
    }

    async getSecurityQuestion(url: string): Promise<string> {
        try {
            const response = await axios.get(url);
            const content = response.data;
            const questionMatch = content.match(/Question:\s*(.*?)(?:\n|$)/);
            if (questionMatch) {
                return questionMatch[1].trim();
            }
            throw new Error('No security question found on the page');
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get security question: ${error.message}`);
            }
            throw error;
        }
    }

    async loginAndGetFlag(url: string, username: string, password: string): Promise<string | null> {
        try {
            const question = await this.getSecurityQuestion(url);
            const answer = await this.gptService.getAnswer(question);
            const loginData = new URLSearchParams({
                username,
                password,
                answer
            });

            const loginResponse = await axios.post(url, loginData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const flag = this.flagService.extractFlag(loginResponse.data);
            if (!flag) {
                throw new Error('No flag found in response');
            }
            return flag;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Login failed: ${error.message}`);
            }
            throw error;
        }
    }
} 