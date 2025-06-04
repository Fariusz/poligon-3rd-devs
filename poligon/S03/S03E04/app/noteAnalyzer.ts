import * as fs from 'fs';
import * as path from 'path';
import { LLMService } from '../../../shared/LLMService';

/**
 * Funkcja pomocnicza do opóźniania wykonania
 * @param ms - Czas opóźnienia w milisekundach
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Interfejs reprezentujący wynik analizy notatki
 * @property names - Lista znalezionych imion i nazwisk
 * @property cities - Lista znalezionych miast
 */
interface AnalysisResult {
    names: string[];
    cities: string[];
}

/**
 * Pobiera notatkę o Barbarze z API
 */
async function fetchNote(): Promise<string> {
    try {
        const response = await fetch('https://c3ntrala.ag3nts.org/dane/barbara.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Błąd podczas pobierania notatki:', error);
        throw error;
    }
}

/**
 * Wyodrębnia JSON z odpowiedzi LLM, która może zawierać formatowanie markdown
 * @param response - Odpowiedź z LLM
 * @returns Wyodrębniony JSON jako string
 */
function extractJsonFromResponse(response: string): string {
    // Usuń ewentualne znaczniki markdown
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                     response.match(/(\{[\s\S]*?\})/);
    
    if (!jsonMatch) {
        throw new Error('Nie znaleziono poprawnego JSON w odpowiedzi LLM');
    }
    
    return jsonMatch[1].trim();
}

/**
 * Analizuje notatkę i wyodrębnia imiona oraz miasta
 */
export async function analyzeNote(): Promise<AnalysisResult> {
    try {
        // Pobierz notatkę z API
        const noteContent = await fetchNote();
        console.log('Pobrano notatkę:', noteContent);

        // Przygotuj prompt dla LLM
        const prompt = `
        Przeanalizuj poniższą notatkę i wyodrębnij z niej:
        1. Wszystkie imiona osób (w formie podstawowej, bez polskich znaków)
        2. Wszystkie nazwy miast (w formie podstawowej, bez polskich znaków)
        
        Notatka:
        ${noteContent}
        
        Zwróć odpowiedź w formacie JSON:
        {
            "names": ["imię1", "imię2", ...],
            "cities": ["miasto1", "miasto2", ...]
        }
        
        Pamiętaj:
        - Zwróć tylko imiona i miasta, bez dodatkowych informacji
        - Użyj formy podstawowej (np. "Jan" zamiast "Jana")
        - Usuń polskie znaki
        - Nie duplikuj wartości
        - Nie dodawaj komentarzy
        `;

        // Wyślij zapytanie do LLM
        const llmService = new LLMService();
        const response = await llmService.sendMessage(prompt);
        
        // Wyodrębnij i przetwórz odpowiedź
        const jsonStr = extractJsonFromResponse(response);
        const result = JSON.parse(jsonStr) as AnalysisResult;
        
        // Upewnij się, że wszystkie wartości są wielkimi literami
        result.names = result.names.map(name => name.toUpperCase());
        result.cities = result.cities.map(city => city.toUpperCase());
        
        return result;
    } catch (error) {
        console.error('Błąd podczas analizy notatki:', error);
        throw error;
    }
} 