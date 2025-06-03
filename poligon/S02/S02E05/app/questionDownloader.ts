import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');

// Create necessary directories
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export async function downloadQuestions(): Promise<void> {
    try {
        const apiKey = process.env.PERSONAL_API_KEY;
        if (!apiKey) {
            throw new Error('PERSONAL_API_KEY not found in environment variables');
        }

        const questionsUrl = `https://c3ntrala.ag3nts.org/data/${apiKey}/arxiv.txt`;
        const questionsPath = path.join(OUTPUT_DIR, 'questions.txt');

        console.log('Downloading questions...');
        const response = await axios.get(questionsUrl);
        fs.writeFileSync(questionsPath, response.data);
        
        console.log('Questions downloaded successfully!');
    } catch (error) {
        console.error('Error downloading questions:', error);
        throw error;
    }
} 