import axios from 'axios';

function getPersonalApiKey(): string {
    const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;
    if (!PERSONAL_API_KEY) {
        throw new Error('PERSONAL_API_KEY is not defined in .env file');
    }
    return PERSONAL_API_KEY;
}

interface BaseReportPayload {
    task: string;
    apikey: string;
    answer: any;
}

interface ErrorHandler {
    handleCentralaError(errorMessage: string): Promise<void>;
}

let errorHandler: ErrorHandler | null = null;

export function setReportProcessor(handler: ErrorHandler) {
    errorHandler = handler;
}

export async function reportToCentrala(data: any): Promise<void> {
    try {
        const response = await axios.post('https://c3ntrala.ag3nts.org/report', data);
        console.log('Centrala response:', response.data);
    } catch (error: any) {
        if (error.response?.data) {
            const { code, message } = error.response.data;
            console.log('Centrala error:', { code, message });
            
            // Jeśli mamy dostęp do handlera, przeanalizuj błąd i spróbuj ponownie
            if (errorHandler && message) {
                await errorHandler.handleCentralaError(message);
                
                // Spróbuj ponownie wysłać zaktualizowane dane
                console.log('\nPróba ponownego wysłania zaktualizowanych danych...');
                const response = await axios.post('https://c3ntrala.ag3nts.org/report', data);
                console.log('Centrala response:', response.data);
            }
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
        apikey: getPersonalApiKey(),
        answer: imageUrl
    });
}

// Helper function for reporting JSON data
export async function reportJsonToCentrala(data: any): Promise<void> {
    await reportToCentrala({
        task: data.task,
        apikey: data.apikey || getPersonalApiKey(),
        answer: data.answer
    });
}