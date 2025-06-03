import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;

if (!PERSONAL_API_KEY) {
    throw new Error('PERSONAL_API_KEY is not defined in .env file');
}

interface BaseReportPayload {
    task: string;
    apikey: string;
    answer: any;
}

export async function reportToCentrala(data: any): Promise<void> {
    try {
        const response = await axios.post('https://c3ntrala.ag3nts.org/report', data);
        console.log('Centrala response:', response.data);
    } catch (error: any) {
        if (error.response?.data?.message) {
            console.log('Centrala error:', error.response.data);
        } else {
            console.log('Error sending to Centrala');
        }
        throw error;
    }
}

// Helper function for reporting image URLs
export async function reportImageUrlToCentrala(imageUrl: string, taskName: string = "robotid"): Promise<void> {
    await reportToCentrala({
        task: taskName,
        apikey: PERSONAL_API_KEY as string,
        answer: imageUrl
    });
}

// Helper function for reporting JSON data
export async function reportJsonToCentrala(data: any, taskName: string = "JSON"): Promise<void> {
    await reportToCentrala({
        task: taskName,
        apikey: data.apikey || PERSONAL_API_KEY as string,
        answer: data
    });
} 