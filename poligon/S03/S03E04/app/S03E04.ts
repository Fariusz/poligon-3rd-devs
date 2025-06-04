// Entry point for the episode

import * as dotenv from 'dotenv';
import * as path from 'path';
import { analyzeNote } from './noteAnalyzer';
import { QueueManager } from './queueManager';
import { ApiService } from './apiService';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';

// Konfiguracja zmiennych środowiskowych
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

interface SearchResult {
    code: number;
    message: string;
    answer?: string;
}

/**
 * Wysyła odpowiedź do endpointu /report
 * @param answer - Nazwa miasta z API
 */
async function reportAnswer(answer: string): Promise<void> {
    const apiKey = process.env.PERSONAL_API_KEY;
    if (!apiKey) {
        throw new Error('Brak klucza API (PERSONAL_API_KEY) w zmiennych środowiskowych');
    }

    try {
        console.log('\n=== Wysyłanie odpowiedzi ===');
        console.log('Odpowiedź do wysłania:', answer);
        
        await reportJsonToCentrala({
            task: "loop",
            apikey: apiKey,
            answer: answer
        });
    } catch (error) {
        console.error('Błąd podczas wysyłania odpowiedzi:', error);
        throw error;
    }
}

/**
 * Główna funkcja wyszukująca Barbarę
 * @returns Wynik wyszukiwania
 */
export async function findBarbara(): Promise<SearchResult> {
    try {
        // Inicjalizacja serwisów
        const queueManager = new QueueManager();
        const apiKey = process.env.PERSONAL_API_KEY;
        if (!apiKey) {
            throw new Error('Brak klucza API (PERSONAL_API_KEY) w zmiennych środowiskowych');
        }
        const apiService = new ApiService(apiKey);

        // Analiza notatki i dodanie początkowych danych do kolejek
        console.log('\n=== Analiza notatki ===');
        const initialData = await analyzeNote();
        console.log('Znalezione imiona:', initialData.names);
        console.log('Znalezione miasta:', initialData.cities);

        // Zapisz miasta z notatki do sprawdzenia czy znalezione miasto jest nowe
        const miastaZNotatki = new Set(initialData.cities.map(city => city.toUpperCase()));

        // Dodaj znalezione osoby i miasta do kolejek
        initialData.names.forEach(name => queueManager.addPerson(name));
        initialData.cities.forEach(city => queueManager.addCity(city));

        // Zbiory do śledzenia sprawdzonych miejsc i osób
        const sprawdzoneMiasta = new Set<string>();
        const sprawdzoneOsoby = new Set<string>();

        // Liczniki iteracji
        let iteracja = 0;

        // Główna pętla wyszukiwania
        while (queueManager.hasItems()) {
            iteracja++;
            console.log(`\n=== Iteracja ${iteracja} ===`);
            console.log('Stan kolejek:');
            console.log('- Osoby do sprawdzenia:', queueManager.getPersons());
            console.log('- Miasta do sprawdzenia:', queueManager.getCities());
            console.log('- Sprawdzone osoby:', Array.from(sprawdzoneOsoby));
            console.log('- Sprawdzone miasta:', Array.from(sprawdzoneMiasta));

            // Sprawdź osoby
            const osoby = queueManager.getPersons();
            for (const osoba of osoby) {
                if (sprawdzoneOsoby.has(osoba)) {
                    console.log(`\n[POMIJAM] Osoba ${osoba} już sprawdzona`);
                    continue;
                }

                console.log(`\n[SPRAWDZAM] Osoba: ${osoba}`);
                try {
                    const miejsca = await apiService.queryPerson(osoba);
                    sprawdzoneOsoby.add(osoba);

                    if (miejsca && miejsca.length > 0) {
                        console.log(`[ZNALEZIONO] Miejsca dla ${osoba}:`, miejsca);
                        
                        // Dodaj nowe miasta do kolejki
                        miejsca.forEach(miejsce => {
                            if (!sprawdzoneMiasta.has(miejsce)) {
                                console.log(`[DODAJĘ] Nowe miasto do kolejki: ${miejsce}`);
                                queueManager.addCity(miejsce);
                            } else {
                                console.log(`[POMIJAM] Miasto ${miejsce} już sprawdzone`);
                            }
                        });
                    } else {
                        console.log(`[BRAK] Nie znaleziono miejsc dla ${osoba}`);
                    }
                } catch (error) {
                    console.error(`[BŁĄD] Podczas sprawdzania osoby ${osoba}:`, error);
                }
            }

            // Sprawdź miasta
            const miasta = queueManager.getCities();
            for (const miasto of miasta) {
                if (sprawdzoneMiasta.has(miasto)) {
                    console.log(`\n[POMIJAM] Miasto ${miasto} już sprawdzone`);
                    continue;
                }

                console.log(`\n[SPRAWDZAM] Miasto: ${miasto}`);
                try {
                    const osoby = await apiService.queryCity(miasto);
                    sprawdzoneMiasta.add(miasto);

                    if (osoby && osoby.length > 0) {
                        console.log(`[ZNALEZIONO] Osoby w ${miasto}:`, osoby);
                        
                        // Jeśli znaleziono Barbarę w tym mieście i jest to nowe miasto
                        if (osoby.includes('BARBARA') && !miastaZNotatki.has(miasto)) {
                            console.log(`[SUKCES] Znaleziono Barbarę w nowym mieście ${miasto}!`);
                            
                            // Wyślij odpowiedź do /report
                            await reportAnswer(miasto);
                            
                            return {
                                code: 0,
                                message: `Barbara jest obecnie w mieście ${miasto}`,
                                answer: miasto
                            };
                        }

                        // Dodaj nowe osoby do kolejki
                        osoby.forEach(osoba => {
                            if (!sprawdzoneOsoby.has(osoba)) {
                                console.log(`[DODAJĘ] Nową osobę do kolejki: ${osoba}`);
                                queueManager.addPerson(osoba);
                            } else {
                                console.log(`[POMIJAM] Osoba ${osoba} już sprawdzona`);
                            }
                        });
                    } else {
                        console.log(`[BRAK] Nie znaleziono osób w ${miasto}`);
                    }
                } catch (error) {
                    console.error(`[BŁĄD] Podczas sprawdzania miasta ${miasto}:`, error);
                }
            }

            // Wyczyść sprawdzone elementy z kolejek
            console.log('\n[CZYSZCZENIE] Usuwam sprawdzone elementy z kolejek');
            queueManager.clearCheckedItems(sprawdzoneOsoby, sprawdzoneMiasta);
        }

        console.log('\n=== Koniec wyszukiwania ===');
        console.log('Nie znaleziono Barbary');
        return {
            code: 1,
            message: 'Nie znaleziono Barbary'
        };

    } catch (error) {
        console.error('\n=== BŁĄD ===');
        console.error('Błąd podczas wyszukiwania:', error);
        return {
            code: 1,
            message: `Błąd podczas wyszukiwania: ${error instanceof Error ? error.message : 'Nieznany błąd'}`
        };
    }
}

// Uruchomienie głównej funkcji programu
findBarbara(); 