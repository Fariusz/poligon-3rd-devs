import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Konfiguracja zmiennych środowiskowych
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * Interfejs reprezentujący odpowiedź z API
 */
interface ApiResponse {
    code: number;
    message: string;
}

/**
 * Interfejs reprezentujący błąd z API
 */
interface ApiError {
    code: number;
    message: string;
}

/**
 * Klasa obsługująca interakcje z API Centrali
 */
export class ApiService {
    private apiKey: string;
    private baseUrl: string;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error('Brak klucza API');
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://c3ntrala.ag3nts.org';
    }

    /**
     * Normalizuje tekst do formatu API (wielkie litery, bez polskich znaków)
     * @param text - Tekst do znormalizowania
     * @returns Znormalizowany tekst
     */
    private normalizeText(text: string): string {
        return text
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Usuń znaki diakrytyczne
            .replace(/[Ą]/g, 'A')
            .replace(/[Ć]/g, 'C')
            .replace(/[Ę]/g, 'E')
            .replace(/[Ł]/g, 'L')
            .replace(/[Ń]/g, 'N')
            .replace(/[Ó]/g, 'O')
            .replace(/[Ś]/g, 'S')
            .replace(/[Ź]/g, 'Z')
            .replace(/[Ż]/g, 'Z')
            .replace(/[ą]/g, 'A')
            .replace(/[ć]/g, 'C')
            .replace(/[ę]/g, 'E')
            .replace(/[ł]/g, 'L')
            .replace(/[ń]/g, 'N')
            .replace(/[ó]/g, 'O')
            .replace(/[ś]/g, 'S')
            .replace(/[ź]/g, 'Z')
            .replace(/[ż]/g, 'Z')
            // Usuń tytuły i inne dodatkowe słowa
            .replace(/\b(PROF|PROFESOR|PROFESORA|DR|DOKTOR|DOKTORA)\b/g, '')
            .trim();
    }

    /**
     * Obsługuje błędy API
     * @param error - Błąd do obsłużenia
     * @returns Sformatowany komunikat błędu
     */
    private handleApiError(error: any): string {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                const errorData = error.response.data;
                if (typeof errorData === 'object') {
                    return `Błąd API (${error.response.status}): ${JSON.stringify(errorData)}`;
                }
                return `Błąd API (${error.response.status}): ${errorData}`;
            } else if (error.request) {
                return 'Brak odpowiedzi z serwera API';
            }
        }
        return `Nieznany błąd: ${error.message}`;
    }

    /**
     * Przetwarza odpowiedź z API na listę miejsc
     * @param response - Odpowiedź z API
     * @returns Lista miejsc
     */
    private processApiResponse(response: ApiResponse): string[] {
        if (response.code === 0) {
            // Jeśli odpowiedź zawiera "[**RESTRICTED DATA**]", zwróć pustą tablicę
            if (response.message === '[**RESTRICTED DATA**]') {
                return [];
            }
            // Podziel wiadomość na pojedyncze miejsca i znormalizuj je
            return response.message
                .split(' ')
                .filter(place => place.length > 0)
                .map(place => this.normalizeText(place));
        }
        return [];
    }

    /**
     * Wysyła zapytanie do API o osobę
     * @param name - Imię osoby do sprawdzenia
     * @returns Lista miejsc powiązanych z osobą
     */
    public async queryPerson(name: string): Promise<string[]> {
        try {
            const normalizedName = this.normalizeText(name);
            console.log(`Wysyłanie zapytania dla osoby: ${normalizedName}`);
            const response = await axios.post<ApiResponse>(`${this.baseUrl}/people`, {
                apikey: this.apiKey,
                query: normalizedName
            });
            return this.processApiResponse(response.data);
        } catch (error) {
            throw new Error(this.handleApiError(error));
        }
    }

    /**
     * Wysyła zapytanie do API o miasto
     * @param city - Nazwa miasta do sprawdzenia
     * @returns Lista miejsc powiązanych z miastem
     */
    public async queryCity(city: string): Promise<string[]> {
        try {
            const normalizedCity = this.normalizeText(city);
            console.log(`Wysyłanie zapytania dla miasta: ${normalizedCity}`);
            const response = await axios.post<ApiResponse>(`${this.baseUrl}/places`, {
                apikey: this.apiKey,
                query: normalizedCity
            });
            return this.processApiResponse(response.data);
        } catch (error) {
            throw new Error(this.handleApiError(error));
        }
    }
} 