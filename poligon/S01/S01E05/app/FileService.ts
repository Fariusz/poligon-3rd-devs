import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class FileService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        // Load environment variables
        dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
        
        const apiKey = process.env.API_TEST;
        if (!apiKey) {
            throw new Error('API_TEST not found in .env file');
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://c3ntrala.ag3nts.org/data/{}/cenzura.txt';
    }

    async downloadFile(): Promise<string> {
        try {
            const url = this.baseUrl.replace('{}', this.apiKey);
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error downloading file:', error.message);
            } else {
                console.error('An unexpected error occurred:', error);
            }
            throw error;
        }
    }

    saveCensoredContent(content: string): void {
        fs.writeFileSync('data/cenzura.txt', content, 'utf-8');
        console.log('\nFile censored successfully!');
        console.log('Censored content saved to cenzura.txt');
    }
} 