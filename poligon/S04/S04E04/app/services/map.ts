import { LLMService, Model } from '../../../../shared/LLMService';
import { Coordinates } from '../types/coordinates';

// Mapowanie współrzędnych na opisy w języku polskim
const LOCATION_MAP: Record<string, string> = {
    '0,0': 'puste pole',
    '1,0': 'trawa',
    '2,0': 'drzewo',
    '3,0': 'dom',
    '0,1': 'trawa',
    '1,1': 'młyn',
    '2,1': 'trawa',
    '3,1': 'trawa',
    '0,2': 'trawa',
    '1,2': 'trawa',
    '2,2': 'kamienie',
    '3,2': 'dwa drzewa',
    '0,3': 'wzgórza',
    '1,3': 'wzgórza',
    '2,3': 'samochód',
    '3,3': 'jaskinia'
};

export class MapService {
    private llmService: LLMService;
    private currentPosition: Coordinates = { x: 0, y: 0 }; // Aktualna pozycja drona

    constructor() {
        this.llmService = new LLMService(`
            Jesteś ekspertem nawigacji dronem. Twoim zadaniem jest interpretacja instrukcji ruchu w języku polskim i określenie końcowej pozycji na siatce 4x4.

            Układ mapy (współrzędne x,y):
            (0,0): start (puste)
            (1,0): trawa
            (2,0): drzewo
            (3,0): dom
            (0,1): trawa
            (1,1): młyn
            (2,1): trawa
            (3,1): trawa
            (0,2): trawa
            (1,2): trawa
            (2,2): kamienie
            (3,2): dwa drzewa
            (0,3): wzgórza
            (1,3): wzgórza
            (2,3): samochód
            (3,3): jaskinia

            Zasady:
            1. ZAWSZE startuj z pozycji (0,0) - IGNORUJ informację o "aktualnej pozycji drona" w promptcie
            2. Wykonaj instrukcję
            3. Zwróć TYLKO współrzędne w formacie "x,y" (np. "1,0" lub "0,1")
            4. NIE dodawaj żadnego innego tekstu
            5. NIE zadawaj pytań
            6. NIE komentuj instrukcji
            7. Jeśli instrukcja jest anulowana (np. "nie idziemy", "albo nie", "nie rób tego"), IGNORUJ ją
            8. Jeśli pojawia się nowa instrukcja po anulowaniu, wykonaj TYLKO tę nową instrukcję
            9. Przy złożonych instrukcjach (np. "w prawo i w dół") wykonaj WSZYSTKIE ruchy po kolei
            10. ZAWSZE wykonuj OSTATNIĄ nieanulowaną instrukcję
            11. Jeśli instrukcja jest anulowana, NIE wykonuj jej, nawet jeśli była wcześniej podana

            Przykłady odpowiedzi:
            "poleciałem w prawo" -> przesuń o 1 w prawo (x+1)
            "poleciałem w dół" -> przesuń o 1 w dół (y+1)
            "poleciałem dwa pola w prawo" -> przesuń o 2 w prawo (x+2)
            "poleciałem w prawo i w dół" -> przesuń o 1 w prawo (x+1) i 1 w dół (y+1)
            "na sam dół mapy" -> przesuń do y=3 (najniższy rząd)
            "na samą górę" -> przesuń do y=0 (najwyższy rząd)
            "na samą lewą stronę" -> przesuń do x=0 (najbardziej lewa kolumna)
            "na samą prawą stronę" -> przesuń do x=3 (najbardziej prawa kolumna)
            "ile tylko możemy w prawo" -> przesuń do x=3 (najbardziej prawa kolumna)
            "ile tylko możemy w lewo" -> przesuń do x=0 (najbardziej lewa kolumna)
            "ile tylko możemy w górę" -> przesuń do y=0 (najwyższy rząd)
            "ile tylko możemy w dół" -> przesuń do y=3 (najniższy rząd)

            Przykłady anulowania instrukcji:
            "idziemy w dół, nie, idziemy w prawo" -> wykonaj TYLKO "idziemy w prawo"
            "na sam dół mapy. Albo nie! nie! nie idziemy. W prawo maksymalnie" -> wykonaj TYLKO "w prawo maksymalnie"
            "w lewo, nie, w prawo" -> wykonaj TYLKO "w prawo"
            "idziemy na sam dół mapy. Albo nie! nie! nie idziemy. Zaczynamy od nowa. W prawo maksymalnie" -> wykonaj TYLKO "w prawo maksymalnie"

            Przykłady złożonych instrukcji:
            "w prawo i w dół" -> przesuń o 1 w prawo (x+1) i 1 w dół (y+1)
            "w dół i w prawo" -> przesuń o 1 w dół (y+1) i 1 w prawo (x+1)
            "w prawo i w dół i w prawo" -> przesuń o 1 w prawo (x+1), 1 w dół (y+1), 1 w prawo (x+1)
            "w prawo i w dół i w dół" -> przesuń o 1 w prawo (x+1), 1 w dół (y+1), 1 w dół (y+1)

            WAŻNE: 
            1. Twoja odpowiedź MUSI być dokładnie w formacie "x,y" bez żadnego dodatkowego tekstu!
            2. ZAWSZE startuj z (0,0) - IGNORUJ informację o "aktualnej pozycji drona" w promptcie!
        `, Model.GPT4_1);
    }

    getLocationDescription(coordinates: Coordinates): string {
        const key = `${coordinates.x},${coordinates.y}`;
        return LOCATION_MAP[key] || 'puste pole';
    }

    async getFinalCoordinates(instruction: string): Promise<Coordinates> {
        // Dodajemy informację o aktualnej pozycji do promptu
        const prompt = `Aktualna pozycja drona: (${this.currentPosition.x},${this.currentPosition.y})\n${instruction}`;
        
        const coordinates = await this.llmService.sendMessage(prompt);
        console.log('LLM response:', coordinates);
        
        // Sprawdzamy czy odpowiedź jest w formacie "x,y"
        if (!/^\d,\d$/.test(coordinates)) {
            console.error('Nieprawidłowy format odpowiedzi:', coordinates);
            return this.currentPosition; // W przypadku błędu zostajemy na miejscu
        }
        
        const [x, y] = coordinates.split(',').map(Number);
        
        // Walidacja współrzędnych
        if (isNaN(x) || isNaN(y) || x < 0 || x > 3 || y < 0 || y > 3) {
            console.error('Nieprawidłowe współrzędne:', coordinates);
            return this.currentPosition; // W przypadku błędu zostajemy na miejscu
        }
        
        // Aktualizujemy pozycję drona
        this.currentPosition = { x, y };
        return this.currentPosition;
    }

    // Metoda do resetowania pozycji drona (opcjonalnie)
    resetPosition(): void {
        this.currentPosition = { x: 0, y: 0 };
    }
} 