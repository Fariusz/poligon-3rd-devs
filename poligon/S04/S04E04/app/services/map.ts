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

export const MAP_DESCRIPTION = `
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
    1. Zawsze startuj z (0,0)
    2. Wykonaj instrukcję
    3. Zwróć TYLKO współrzędne w formacie "x,y" (np. "1,0" lub "0,1")
    4. NIE dodawaj żadnego innego tekstu
    5. NIE zadawaj pytań
    6. NIE komentuj instrukcji

    Przykłady odpowiedzi:
    "poleciałem w prawo" -> "1,0"
    "poleciałem w dół" -> "0,1"
    "poleciałem dwa pola w prawo" -> "2,0"
    "poleciałem w prawo i w dół" -> "1,1"

    WAŻNE: Twoja odpowiedź MUSI być dokładnie w formacie "x,y" bez żadnego dodatkowego tekstu!
`;

export class MapService {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService(MAP_DESCRIPTION, Model.GPT4_MINI);
    }

    getLocationDescription(coordinates: Coordinates): string {
        const key = `${coordinates.x},${coordinates.y}`;
        return LOCATION_MAP[key] || 'puste pole';
    }

    async getFinalCoordinates(instruction: string): Promise<Coordinates> {
        const coordinates = await this.llmService.sendMessage(instruction);
        console.log('LLM response:', coordinates);
        
        // Sprawdzamy czy odpowiedź jest w formacie "x,y"
        if (!/^\d,\d$/.test(coordinates)) {
            console.error('Nieprawidłowy format odpowiedzi:', coordinates);
            return { x: 0, y: 0 };
        }
        
        const [x, y] = coordinates.split(',').map(Number);
        
        // Walidacja współrzędnych
        if (isNaN(x) || isNaN(y) || x < 0 || x > 3 || y < 0 || y > 3) {
            console.error('Nieprawidłowe współrzędne:', coordinates);
            return { x: 0, y: 0 }; // W przypadku błędu wracamy do punktu startowego
        }
        
        return { x, y };
    }
} 