import { LLMService } from '../../../shared/LLMService';
import { Model } from '../../../shared/LLMService';

interface NormalizationResult {
    names: string[];
    cities: string[];
}

export class NormalizationService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService();
    }

    /**
     * Normalizuje listę imion używając LLM
     * @param names - Lista imion do znormalizowania
     * @returns Znormalizowane imiona
     */
    private async normalizeNames(names: string[]): Promise<string[]> {
        const prompt = `
            Przeanalizuj poniższe dane i zwróć TYLKO znormalizowane wersje imion, bez oryginalnych form.

            Zasady normalizacji imion:
            1. Wyodrębnij tylko imiona (bez nazwisk)
            2. Zamień na wielkie litery
            4. Usuń końcówki przypadków (np. BARBARA zamiast BARBARY)
            5. Usuń wszystkie duplikaty
            6. Usuń tytuły (np. "profesor", "dr")
            7. Połącz postacie ze sobą (np. profesora maja to Andrzej Maj to Andrzej, Rafał Bomba to Rafał)

            Przykłady normalizacji:
            - "Barbara Zawadzka" -> "BARBARA"
            - "profesor Andrzej Maj" -> "ANDRZEJ"
            - "Barbary" -> "BARBARA"
            - "Aleksandra Ragowskiego" -> "ALEKSANDRA"

            WAŻNE: 
            - Zwróć TYLKO tablicę JSON z znormalizowanymi imionami
            - NIE zwracaj oryginalnych form
            - NIE dodawaj żadnych wyjaśnień
            - Format odpowiedzi: ["imię1", "imię2", ...]

            Imiona do znormalizowania: ${JSON.stringify(names)}
        `;

        const response = await this.llmService.sendMessage(
            prompt, 
            'Jesteś asystentem, który normalizuje imiona. Zwracasz TYLKO tablicę JSON z znormalizowanymi imionami, bez oryginalnych form i bez żadnych wyjaśnień.', 
            Model.GPT4_1
        );
        
        try {
            const result = JSON.parse(response) as string[];
            if (!Array.isArray(result)) {
                throw new Error('Nieprawidłowy format odpowiedzi - oczekiwano tablicy');
            }
            return [...new Set(result.filter(name => name.trim().length > 0))];
        } catch (error) {
            console.error('Błąd parsowania odpowiedzi LLM dla imion:', response);
            throw new Error('Nie udało się sparsować odpowiedzi LLM dla imion jako JSON');
        }
    }

    /**
     * Normalizuje listę miast używając LLM
     * @param cities - Lista miast do znormalizowania
     * @returns Znormalizowane miasta
     */
    private async normalizeCities(cities: string[]): Promise<string[]> {
        const prompt = `
            Przeanalizuj poniższe dane i zwróć TYLKO znormalizowane wersje miast, bez oryginalnych form.

            Zasady normalizacji miast:
            1. Zamień na wielkie litery
            2. Usuń polskie znaki
            3. Usuń końcówki przypadków
            4. Usuń wszystkie duplikaty

            Przykłady normalizacji:
            - "Warszawy" -> "WARSZAWA"
            - "Krakowie" -> "KRAKOW"
            - "Gdańsku" -> "GDANSK"
            - "Poznania" -> "POZNAN"

            WAŻNE: 
            - Zwróć TYLKO tablicę JSON z znormalizowanymi miastami
            - NIE zwracaj oryginalnych form
            - NIE dodawaj żadnych wyjaśnień
            - Format odpowiedzi: ["miasto1", "miasto2", ...]

            Miasta do znormalizowania: ${JSON.stringify(cities)}
        `;

        const response = await this.llmService.sendMessage(
            prompt, 
            'Jesteś asystentem, który normalizuje nazwy miast. Zwracasz TYLKO tablicę JSON z znormalizowanymi miastami, bez oryginalnych form i bez żadnych wyjaśnień.', 
            Model.GPT4_1
        );
        
        try {
            const result = JSON.parse(response) as string[];
            if (!Array.isArray(result)) {
                throw new Error('Nieprawidłowy format odpowiedzi - oczekiwano tablicy');
            }
            return [...new Set(result.filter(city => city.trim().length > 0))];
        } catch (error) {
            console.error('Błąd parsowania odpowiedzi LLM dla miast:', response);
            throw new Error('Nie udało się sparsować odpowiedzi LLM dla miast jako JSON');
        }
    }

    /**
     * Normalizuje listę imion i miast używając LLM
     * @param names - Lista imion do znormalizowania
     * @param cities - Lista miast do znormalizowania
     * @returns Znormalizowane imiona i miasta
     */
    public async normalize(names: string[], cities: string[]): Promise<NormalizationResult> {
        try {
            // Równoległe wykonanie normalizacji imion i miast
            const [normalizedNames, normalizedCities] = await Promise.all([
                this.normalizeNames(names),
                this.normalizeCities(cities)
            ]);

            return {
                names: normalizedNames,
                cities: normalizedCities
            };
        } catch (error) {
            console.error('Błąd podczas normalizacji:', error);
            throw error;
        }
    }
} 