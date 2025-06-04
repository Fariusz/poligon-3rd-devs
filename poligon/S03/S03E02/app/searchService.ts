import { client, COLLECTION_NAME } from './qdrant';
import { LLMService } from '@shared/LLMService';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export class SearchService {
    private readonly llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    private async getEmbedding(text: string): Promise<number[]> {
        try {
            return await this.llmService.getEmbedding(text);
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    async search(query: string): Promise<{ date: string; content: string; score: number } | null> {
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.getEmbedding(query);

            // Search in Qdrant
            const searchResult = await client.search(COLLECTION_NAME, {
                vector: queryEmbedding,
                limit: 1,  // We only need the most relevant result
                with_payload: true,
                with_vector: false
            });

            if (searchResult.length === 0) {
                console.log('No matching reports found');
                return null;
            }

            const bestMatch = searchResult[0];
            const payload = bestMatch.payload as { date: string; content: string };

            return {
                date: payload.date,
                content: payload.content,
                score: bestMatch.score
            };
        } catch (error) {
            console.error('Error searching reports:', error);
            throw error;
        }
    }
} 