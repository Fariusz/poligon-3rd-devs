import axios from 'axios';
import { QuestionsResponse } from '../types/questions';

export class ApiService {
    private readonly baseUrl: string;

    constructor(apiKey: string) {
        this.baseUrl = `https://c3ntrala.ag3nts.org/data/${apiKey}`;
    }

    async fetchQuestions(): Promise<QuestionsResponse> {
        try {
            const response = await axios.get<QuestionsResponse>(`${this.baseUrl}/softo.json`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch questions: ${error.message}`);
            }
            throw error;
        }
    }
} 