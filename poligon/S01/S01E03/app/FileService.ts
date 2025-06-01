import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ResponseData } from './types';

export class FileService {
    private dataDir: string;
    private apiKey: string;

    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir);
        }

        // Load environment variables
        dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
        
        const apiKey = process.env.API_TEST;
        if (!apiKey) {
            throw new Error('API_TEST not found in .env file');
        }
        this.apiKey = apiKey;
    }

    async downloadAndSaveFile(): Promise<ResponseData> {
        try {
            const url = `https://c3ntrala.ag3nts.org/data/${this.apiKey}/json.txt`;
            const response = await axios.get(url);
            
            // Save the file
            const outputPath = path.join(this.dataDir, 'downloaded_data.json');
            fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
            
            console.log('File downloaded successfully to:', outputPath);
            
            return response.data;
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    saveCorrectedData(data: any): void {
        const correctedOutputPath = path.join(this.dataDir, 'corrected_data.json');
        fs.writeFileSync(correctedOutputPath, JSON.stringify(data, null, 2));
        console.log('\nCorrected data saved to:', correctedOutputPath);
    }

    getApiKey(): string {
        return this.apiKey;
    }
} 