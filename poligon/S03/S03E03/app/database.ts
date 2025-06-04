import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const API_URL = 'https://c3ntrala.ag3nts.org/apidb';
const API_KEY = process.env.PERSONAL_API_KEY;

if (!API_KEY) {
    console.error('Error: PERSONAL_API_KEY is not defined in .env file');
    process.exit(1);
}

interface DatabaseResponse {
    success: boolean;
    data?: any;
    error?: string;
}

interface DatabaseRequest {
    task: 'database';
    apikey: string;
    query: string;
}

/**
 * Wysyła zapytanie do API bazy danych
 * @param apiKey Klucz API
 * @param sql Zapytanie SQL do wykonania
 * @returns Odpowiedź z bazy danych
 */
export async function queryDatabase(apiKey: string, sql: string): Promise<DatabaseResponse> {
    console.log('\n=== Zapytanie do bazy danych ===');
    console.log('SQL:', sql);
    
    const requestBody: DatabaseRequest = {
        task: 'database',
        apikey: apiKey,
        query: sql
    };
    
    try {
        const response = await axios.post(API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('\n=== Odpowiedź z bazy danych ===');
        console.log(JSON.stringify(response.data, null, 2));

        // Sprawdź czy odpowiedź zawiera błąd
        if (response.data && response.data.error && response.data.error !== "OK") {
            console.error('Błąd w odpowiedzi:', response.data.error);
            return {
                success: false,
                error: response.data.error
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data) {
            console.error('Data:', error.response.data);
            return {
                success: false,
                error: error.response.data.error || error.message
            };
        }
        
        return {
            success: false,
            error: 'Unknown error occurred'
        };
    }
} 