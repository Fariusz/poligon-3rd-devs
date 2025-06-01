import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';
import { generateImage } from './imageGenerator';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;

if (!PERSONAL_API_KEY) {
    throw new Error('PERSONAL_API_KEY is not defined in .env file');
}

interface RobotDescription {
    description: string;
}

export async function getRobotDescription(): Promise<string> {
    try {
        const response = await axios.get<RobotDescription>(
            `https://c3ntrala.ag3nts.org/data/${PERSONAL_API_KEY}/robotid.json`
        );
        const description = response.data.description;
        console.log('Robot Description:', description);
        return description;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching robot description:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error;
    }
} 