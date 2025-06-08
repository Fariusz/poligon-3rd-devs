import axios from 'axios';

const API_URL = 'https://c3ntrala.ag3nts.org/apidb';

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
 * Sends a query to the database API
 * @param apiKey API key for authentication
 * @param sql SQL query to execute
 * @returns Database response
 */
export async function queryDatabase(apiKey: string, sql: string): Promise<DatabaseResponse> {
    console.log('\n=== Database Query ===');
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

        console.log('\n=== Database Response ===');
        console.log(JSON.stringify(response.data, null, 2));

        // Check if response contains an error
        if (response.data && response.data.error && response.data.error !== "OK") {
            console.error('Error in response:', response.data.error);
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