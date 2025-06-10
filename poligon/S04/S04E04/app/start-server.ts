import { serve } from "bun";
import { DroneService } from './services/drone';
import { DroneInstruction } from './types/drone';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
const TIMEOUT_MS = 14000; // 14 sekund (z zapasem 1 sekundy)
const droneService = new DroneService();

// Funkcja do logowania z timestampem i formatowaniem
function log(message: string, data?: any, type: 'info' | 'error' | 'request' | 'response' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: 'ℹ️',
        error: '❌',
        request: '📥',
        response: '📤'
    }[type];
    
    console.log(`\n${prefix} [${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Funkcja do logowania żądania
function logRequest(req: Request) {
    const url = new URL(req.url);
    log('Incoming Request', {
        method: req.method,
        url: url.pathname,
        headers: Object.fromEntries(req.headers.entries()),
        query: Object.fromEntries(url.searchParams.entries())
    }, 'request');
}

// Funkcja do logowania odpowiedzi
function logResponse(response: Response) {
    log('Outgoing Response', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
    }, 'response');
}

// Funkcja do tworzenia odpowiedzi
function createResponse(description: string): Response {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    return new Response(
        JSON.stringify({ description }),
        { 
            status: 200,
            headers
        }
    );
}

// Funkcja do obsługi timeoutu
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
}

const server = serve({
    port: PORT,
    async fetch(req) {
        // Logowanie przychodzącego żądania
        logRequest(req);

        const url = new URL(req.url);
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        // Obsługa CORS
        if (req.method === "OPTIONS") {
            const response = new Response(null, { headers });
            logResponse(response);
            return response;
        }

        // Obsługa endpointu drona
        if (req.method === "POST" && url.pathname === "/drone") {
            try {
                // Sprawdź Content-Type
                const contentType = req.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    log('Invalid Content-Type', { contentType }, 'error');
                    const response = createResponse("puste pole");
                    logResponse(response);
                    return response;
                }

                const body = await req.json();
                log('Request body:', body, 'request');

                // Walidacja formatu danych wejściowych
                if (!body || typeof body !== 'object') {
                    log('Invalid request body format', body, 'error');
                    const response = createResponse("puste pole");
                    logResponse(response);
                    return response;
                }

                const instruction: DroneInstruction = body;
                
                // Obsługa pustej instrukcji
                if (!instruction.instruction) {
                    log('Empty instruction received, returning starting position', null, 'info');
                    const response = createResponse("puste pole");
                    logResponse(response);
                    return response;
                }

                // Przetwarzanie instrukcji z timeoutem
                log('Processing instruction:', instruction.instruction, 'info');
                try {
                    const result = await withTimeout(
                        droneService.processInstruction(instruction),
                        TIMEOUT_MS
                    );
                    log('Processing result:', result, 'info');
                    
                    // Upewniamy się, że odpowiedź ma wymagany format
                    if (!result.description || typeof result.description !== 'string') {
                        log('Invalid response format:', result, 'error');
                        const response = createResponse("puste pole");
                        logResponse(response);
                        return response;
                    }

                    // Zwracamy tylko pole description
                    const response = createResponse(result.description);
                    logResponse(response);
                    return response;
                } catch (timeoutError) {
                    log('Timeout while processing instruction', timeoutError, 'error');
                    const response = createResponse("puste pole");
                    logResponse(response);
                    return response;
                }
            } catch (error) {
                log('Error processing request:', error, 'error');
                const response = createResponse("puste pole");
                logResponse(response);
                return response;
            }
        }

        // Endpoint testowy
        if (req.method === "GET" && url.pathname === "/") {
            const response = new Response(
                JSON.stringify({ 
                    status: "ok", 
                    message: "Drone navigation server is running",
                    endpoints: {
                        drone: "/drone (POST)",
                        health: "/ (GET)"
                    }
                }),
                { status: 200, headers }
            );
            logResponse(response);
            return response;
        }

        const notFoundResponse = createResponse("puste pole");
        logResponse(notFoundResponse);
        return notFoundResponse;
    },
});

log('Server started', {
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    azylUrl: `https://azyl-${process.env.AZYL_PORT || '50005'}.ag3nts.org/drone`,
    timeout: `${TIMEOUT_MS}ms`
}, 'info'); 