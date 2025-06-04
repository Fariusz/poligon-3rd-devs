// Entry point for the episode

import { queryDatabase } from './database';
import { DatabaseResponseHandler } from './databaseResponse';
import { SQLGenerator } from './sqlGenerator';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const API_KEY = process.env.PERSONAL_API_KEY;

if (!API_KEY) {
    console.error('Error: PERSONAL_API_KEY is not defined in .env file');
    process.exit(1);
}

interface TableInfo {
    name: string;
    structure?: string;
}

// Mapowanie nazw tabel i kolumn z bazy danych
const TABLE_NAMES = {
    USERS: 'users',
    DATACENTERS: 'datacenters'
};

const COLUMN_NAMES = {
    DC_ID: 'DC_ID',
    USER_ID: 'user_id',
    IS_ACTIVE: 'is_active',
    MANAGER_ID: 'manager_id'
};

function validateTableAndColumnNames(tables: TableInfo[]): void {
    console.log('\nSprawdzanie nazw tabel i kolumn...');
    
    // Sprawdź czy wszystkie wymagane tabele istnieją
    const foundTables = new Set(tables.map(t => t.name.toLowerCase()));
    const missingTables = Object.values(TABLE_NAMES)
        .filter(name => !foundTables.has(name.toLowerCase()));
    
    if (missingTables.length > 0) {
        console.warn('UWAGA: Nie znaleziono następujących tabel:', missingTables);
    }

    // Sprawdź czy struktury tabel zawierają wymagane kolumny
    for (const table of tables) {
        if (table.structure) {
            const structure = table.structure.toLowerCase();
            const requiredColumns = Object.values(COLUMN_NAMES)
                .filter(col => col.toLowerCase().includes(table.name.toLowerCase()));
            
            const missingColumns = requiredColumns
                .filter(col => !structure.includes(col.toLowerCase()));
            
            if (missingColumns.length > 0) {
                console.warn(`UWAGA: W tabeli ${table.name} nie znaleziono kolumn:`, missingColumns);
            }
        }
    }
}

async function getTableStructure(apiKey: string, tableName: string): Promise<string | null> {
    try {
        const result = await queryDatabase(apiKey, `SHOW CREATE TABLE ${tableName}`);
        if (result.success) {
            return DatabaseResponseHandler.processShowCreateTableResponse(result.data);
        }
        console.error(`Failed to get structure for table ${tableName}:`, result.error);
        return null;
    } catch (error) {
        console.error(`Error getting structure for table ${tableName}:`, error);
        return null;
    }
}

function extractDCIDs(data: any): number[] {
    try {
        // Sprawdź czy dane zawierają pole 'reply'
        if (data && data.reply && Array.isArray(data.reply)) {
            // Przetwórz każdy element z tablicy reply
            const ids = data.reply.map((row: { dc_id: string | number }) => {
                if (row && typeof row === 'object' && 'dc_id' in row) {
                    const id = Number(row.dc_id);
                    return isNaN(id) ? null : id;
                }
                return null;
            }).filter((id: number | null): id is number => id !== null);

            // Usuń duplikaty i posortuj
            const uniqueIds = [...new Set(ids)].sort((a, b) => (a as number) - (b as number));

            console.log('Przetworzone ID datacenterów:', uniqueIds);
            return uniqueIds as number[];
        }

        console.warn('Nieprawidłowy format danych:', data);
        return [];
    } catch (error) {
        console.error('Błąd podczas przetwarzania wyników:', error);
        return [];
    }
}

function validateResponseFormat(dcIds: number[]): boolean {
    if (!Array.isArray(dcIds)) {
        console.error('Błąd: Odpowiedź nie jest tablicą');
        return false;
    }

    if (dcIds.length === 0) {
        console.warn('Ostrzeżenie: Pusta tablica ID');
        return true; // To nie jest błąd, po prostu nie znaleziono pasujących datacenterów
    }

    const invalidIds = dcIds.filter(id => typeof id !== 'number' || isNaN(id));
    if (invalidIds.length > 0) {
        console.error('Błąd: Znaleziono nieprawidłowe ID:', invalidIds);
        return false;
    }

    return true;
}

async function main() {
    try {
        // =============================================
        // KROK 1: Nawiązanie połączenia z API bazy danych
        // =============================================
        console.log('\n=== KROK 1: Nawiązanie połączenia z API bazy danych ===');
        console.log('Sprawdzanie połączenia z bazą danych...\n');

        // =============================================
        // KROK 2: Odkrywanie struktury bazy danych
        // =============================================
        console.log('\n=== KROK 2: Odkrywanie struktury bazy danych ===');
        console.log('Wykonywanie zapytania SHOW TABLES...\n');

        const tablesResult = await queryDatabase(API_KEY as string, 'SHOW TABLES');
        
        if (tablesResult.success) {
            try {
                // Pobieranie listy tabel
                const tables = DatabaseResponseHandler.processShowTablesResponse(tablesResult.data);
                
                // Pobieranie struktury każdej tabeli
                console.log('Pobieranie struktury tabel...\n');
                for (const table of tables) {
                    const structure = await getTableStructure(API_KEY as string, table.name);
                    if (structure) {
                        table.structure = structure;
                    }
                }

                // Sprawdzanie nazw tabel i kolumn
                validateTableAndColumnNames(tables);

                // Wyświetlanie wyników
                console.log('\nZnalezione tabele i ich struktury:');
                console.log(DatabaseResponseHandler.formatTableList(tables));

                // Zapisywanie struktur do plików
                console.log('\nZapisywanie struktur tabel do plików...');
                DatabaseResponseHandler.saveTableStructures(tables);

                // =============================================
                // KROK 3: Generowanie zapytania SQL za pomocą LLM
                // =============================================
                console.log('\n=== KROK 3: Generowanie zapytania SQL za pomocą LLM ===');
                
                const sqlGenerator = new SQLGenerator();
                
                // Przekazanie schematów tabel do LLM i prośba o wygenerowanie zapytania
                const queryPrompt = `Based on the following table schemas, write a SQL query that will:
                1. Return DC_ID of active datacenters where the managers are inactive
                2. Use the correct table joins based on the schema
                3. Use the correct columns for filtering active/inactive status
                
                IMPORTANT: The query should return ONLY the DC_ID column, not an object with DC_ID.
                Example of correct result format: [123, 456, 789]
                Example of incorrect result format: [{"DC_ID": 123}, {"DC_ID": 456}]
                
                Return ONLY the raw SQL query.`;
                
                const generatedQuery = await sqlGenerator.generateQuery(queryPrompt);
                console.log('\nWygenerowane zapytanie SQL:');
                console.log(generatedQuery);

                // =============================================
                // KROK 4: Wykonanie wygenerowanego zapytania SQL
                // =============================================
                console.log('\n=== KROK 4: Wykonanie wygenerowanego zapytania SQL ===');
                console.log('Wysyłanie zapytania do bazy danych...\n');

                const queryResult = await queryDatabase(API_KEY as string, generatedQuery);
                
                if (queryResult.success) {
                    console.log('Wyniki zapytania:');
                    console.log(JSON.stringify(queryResult.data, null, 2));

                    // =============================================
                    // KROK 5: Przetwarzanie wyników
                    // =============================================
                    console.log('\n=== KROK 5: Przetwarzanie wyników ===');
                    console.log('Wyodrębnianie listy ID datacenterów...\n');

                    const dcIds = extractDCIDs(queryResult.data);
                    
                    // Sprawdź format odpowiedzi przed wysłaniem
                    if (validateResponseFormat(dcIds)) {
                        console.log('Lista ID datacenterów z nieaktywnymi managerami:');
                        console.log(dcIds);

                        // =============================================
                        // KROK 6: Wysłanie odpowiedzi do centrali
                        // =============================================
                        console.log('\n=== KROK 6: Wysłanie odpowiedzi do centrali ===');
                        console.log('Przygotowywanie i wysyłanie odpowiedzi...\n');

                        try {
                            await reportJsonToCentrala({
                                task: 'database',
                                apikey: API_KEY,
                                answer: dcIds
                            });
                            console.log('Odpowiedź została pomyślnie wysłana do centrali');
                        } catch (error) {
                            if (axios.isAxiosError(error) && error.response?.data) {
                                console.error('Data:', error.response.data);
                            }
                        }
                    } else {
                        console.error('Błąd: Nieprawidłowy format odpowiedzi. Nie wysyłam do centrali.');
                    }

                } else {
                    console.error('Błąd podczas wykonywania zapytania:', queryResult.error);
                }

            } catch (error) {
                console.error('Błąd podczas przetwarzania odpowiedzi z bazy danych:', error);
                console.log('Surowa odpowiedź:', JSON.stringify(tablesResult.data, null, 2));
            }
        } else {
            console.error('Błąd z bazy danych:', tablesResult.error);
        }
    } catch (error) {
        console.error('Błąd w głównej funkcji:', error);
    }
}

// Execute main function
main().catch(console.error); 