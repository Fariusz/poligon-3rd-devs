import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { reportToCentrala } from '../../../shared/centralaReporter';
import { saveFeedback } from './feedbackManager';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;

interface Answer {
    [key: string]: string;
}

interface CentralaResponse {
    status: 'success' | 'error';
    message: string;
    feedback?: {
        questionNumber: string;
        incorrectAnswer: string;
        context?: string;
    }[];
}

async function readAnswers(): Promise<Answer> {
    const answersPath = path.join(__dirname, '../data/output/answers.txt');
    const content = fs.readFileSync(answersPath, 'utf-8');
    
    const answers: Answer = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
            const [, number, answer] = match;
            // Format number to two digits (e.g., "1" -> "01")
            const formattedNumber = number.padStart(2, '0');
            answers[formattedNumber] = answer.trim();
        }
    }
    
    return answers;
}

async function sendAnswers(answers: Answer): Promise<void> {
    try {
        const data = {
            task: "arxiv",
            apikey: PERSONAL_API_KEY,
            answer: answers
        };
        
        console.log('Sending answers to Centrala:');
        console.log(JSON.stringify(data, null, 2));
        
        // Send answers to Centrala
        await reportToCentrala(data);
        
        // Get feedback from Centrala's response
        const response = await axios.get('https://c3ntrala.ag3nts.org/feedback', {
            params: { task: "arxiv" }
        });
        
        const centralaResponse = response.data as CentralaResponse;
        
        // Handle feedback if provided
        if (centralaResponse.feedback && centralaResponse.feedback.length > 0) {
            console.log(centralaResponse.message);
            
            // Save each feedback entry
            for (const feedback of centralaResponse.feedback) {
                saveFeedback({
                    ...feedback,
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (error: any) {
        if (error.response?.data?.message) {
            console.log(error.response.data.message);
        } else {
            console.log('Error sending answers to Centrala');
        }
        process.exit(1);
    }
}

export async function sendAnswersToCentrala(): Promise<void> {
    try {
        const answers = await readAnswers();
        await sendAnswers(answers);
    } catch (error) {
        console.error('Error in sendAnswersToCentrala:', error);
        throw error;
    }
} 