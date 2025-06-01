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

export async function reportToCentrala(payload: BaseReportPayload): Promise<void> {
    try {
        console.log('Sending to Centrala:', {
            task: payload.task,
            answer: payload.answer
        });

        const response = await axios.post(
            'https://c3ntrala.ag3nts.org/report',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('\nResponse from Centrala:');
        console.log('------------------------');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('------------------------\n');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error sending to Centrala:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
        } else {
            console.error('Unexpected error:', error);
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
        apikey: PERSONAL_API_KEY as string,
        answer: data
    });
} 