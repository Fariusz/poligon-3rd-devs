import * as fs from 'fs-extra';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface Report {
    fileName: string;
    content: string;
    timestamp?: Date;
    category?: string;
    keywords?: string[];
    relatedFacts?: string[];
}

export interface AnalysisResult {
    task: string;
    apikey: string;
    answer: {
        [key: string]: string;
    };
}

interface ProcessedFact {
    content: string;
    people: Array<{
        firstName: string;
        lastName: string;
        role?: string;
        skills?: string[];
    }>;
    locations: string[];
    dates: string[];
    keywords: string[];
}

export class ReportProcessor {
    private readonly reportsDir: string;
    private readonly factsDir: string;
    private readonly llmService: LLMService;
    private processedFacts: ProcessedFact[] = [];
    private processedReports: Report[] = [];
    private result: AnalysisResult = {
        task: "dokumenty",
        apikey: process.env.PERSONAL_API_KEY || "",
        answer: {}
    };
    private promptCache: Map<string, string> = new Map();

    constructor(dataDir: string) {
        this.reportsDir = path.join(dataDir, 'organized', 'txt', 'reports');
        this.factsDir = path.join(dataDir, 'organized', 'txt', 'facts');
        this.llmService = new LLMService(
            "Jesteś ekspertem w analizie tekstu. Twoim zadaniem jest analiza raportów i faktów, oraz generowanie precyzyjnych słów kluczowych w języku polskim.",
            Model.GPT4_1
        );
    }

    private async sendPromptWithCache(prompt: string, cacheKey: string): Promise<string> {
        // Sprawdź czy mamy zapisany wynik w cache
        const cachedResult = this.promptCache.get(cacheKey);
        if (cachedResult) {
            console.log(`Using cached result for: ${cacheKey}`);
            return cachedResult;
        }

        // Jeśli nie ma w cache, wyślij prompt do LLM
        const result = await this.llmService.sendMessage(prompt);
        
        // Zapisz wynik w cache
        this.promptCache.set(cacheKey, result);
        return result;
    }

    private async processFacts(): Promise<void> {
        if (this.processedFacts.length > 0) return; // Already processed

        const facts = await this.loadFacts();
        console.log(`\nProcessing ${facts.length} facts...`);

        for (const fact of facts) {
            try {
                const prompt = `
Przeanalizuj poniższy fakt i wyodrębnij kluczowe informacje.

FAKT:
${fact}

Wyodrębnij i zwróć w formacie JSON:
{
    "people": [
        {
            "firstName": "imię",
            "lastName": "nazwisko",
            "role": "zawód/rola (opcjonalnie)",
            "skills": ["umiejętność1", "umiejętność2", ...]
        }
    ],
    "locations": ["miejsce1", "miejsce2", ...],
    "dates": ["data1", "data2", ...],
    "keywords": ["słowo1", "słowo2", ...]
}

Zwróć tylko JSON, bez żadnego dodatkowego tekstu.`;

                const response = await this.llmService.sendMessage(prompt);
                const processedFact: ProcessedFact = {
                    content: fact,
                    ...JSON.parse(response)
                };
                this.processedFacts.push(processedFact);
            } catch (error) {
                console.error('Error processing fact:', error);
            }
        }

        console.log('Facts processing completed.');
    }

    async analyzeReportsWithFacts(): Promise<AnalysisResult> {
        // First, process all facts
        await this.processFacts();

        const reports = await this.loadReports();
        
        // Ensure we have exactly 10 reports
        if (reports.length < 10) {
            throw new Error(`Expected 10 reports, but found only ${reports.length}`);
        }
        
        const reportsToProcess = reports.slice(0, 10);
        console.log(`\nProcessing exactly 10 reports...`);
        
        this.processedReports = reportsToProcess;
        this.result = {
            task: "dokumenty",
            apikey: process.env.PERSONAL_API_KEY || "",
            answer: {}
        };

        // Process reports in sequence to ensure proper order
        for (let i = 0; i < reportsToProcess.length; i++) {
            const report = reportsToProcess[i];
            console.log('\n----------------------------------------');
            console.log(`Analyzing report ${i + 1}/10: ${report.fileName}`);
            
            try {
                // Extract information from filename
                const filenameInfo = await this.analyzeFilename(report.fileName);
                console.log('Filename analysis:', filenameInfo);

                // Generate initial keywords from report content and filename
                const initialKeywords = await this.generateInitialKeywords(report.content, filenameInfo);
                console.log('Initial keywords:', initialKeywords);

                // Extract people from the report
                const reportPeople = await this.extractPeopleFromReport(report.content);
                console.log('People from report:', reportPeople);

                // Find related facts based on people, locations, and dates
                const relatedFacts = this.findRelatedFacts(reportPeople, initialKeywords);
                console.log('Related facts found:', relatedFacts.length);

                // Generate final keywords combining report and facts
                const finalKeywords = await this.generateFinalKeywords(
                    report.content,
                    filenameInfo,
                    initialKeywords,
                    relatedFacts
                );

                // Validate the keywords
                if (!finalKeywords || finalKeywords.trim() === '') {
                    throw new Error('Generated keywords are empty');
                }

                // Ensure no duplicate keys in the result
                if (this.result.answer[report.fileName]) {
                    throw new Error(`Duplicate report file name: ${report.fileName}`);
                }

                this.result.answer[report.fileName] = finalKeywords;
                console.log('\nFinal keywords:', finalKeywords);

                // Save intermediate results after each report
                const intermediatePath = path.join(this.reportsDir, '..', 'analysis_intermediate.json');
                await fs.writeJson(intermediatePath, this.result, { spaces: 2 });
                console.log('Intermediate results saved to:', intermediatePath);

            } catch (error: unknown) {
                console.error(`Error processing report ${report.fileName}:`, error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new Error(`Failed to process report ${report.fileName}: ${errorMessage}`);
            }
        }

        // Validate final result
        this.validateResult(this.result);

        // Save the final result
        const analysisPath = path.join(this.reportsDir, '..', 'analysis.json');
        await fs.writeJson(analysisPath, this.result, { spaces: 2 });
        console.log('\nFinal analysis saved to:', analysisPath);

        return this.result;
    }

    private validateResult(result: AnalysisResult): void {
        // Validate task
        if (!result.task || result.task !== "dokumenty") {
            throw new Error('Invalid task in result');
        }

        // Validate API key
        if (!result.apikey) {
            throw new Error('Missing API key in result');
        }

        // Validate answer object
        if (!result.answer || typeof result.answer !== 'object') {
            throw new Error('Invalid answer object in result');
        }

        // Validate number of reports
        const reportCount = Object.keys(result.answer).length;
        if (reportCount !== 10) {
            throw new Error(`Expected 10 reports in result, but found ${reportCount}`);
        }

        // Validate each report entry
        for (const [fileName, keywords] of Object.entries(result.answer)) {
            if (!fileName) {
                throw new Error('Empty file name in result');
            }
            if (!keywords || typeof keywords !== 'string' || keywords.trim() === '') {
                throw new Error(`Invalid keywords for report ${fileName}`);
            }
        }

        // Check for duplicate keys
        const uniqueKeys = new Set(Object.keys(result.answer));
        if (uniqueKeys.size !== 10) {
            throw new Error('Duplicate report file names in result');
        }
    }

    private async generateInitialKeywords(content: string, filenameInfo: string): Promise<string[]> {
        const cacheKey = `initial_keywords_${content}_${filenameInfo}`;
        const prompt = `
Wygeneruj wstępne słowa kluczowe na podstawie treści raportu i informacji z nazwy pliku.

TREŚĆ RAPORTU:
${content}

INFORMACJE Z NAZWY PLIKU:
${filenameInfo}

Wygeneruj listę słów kluczowych według następujących zasad:
- Słowa kluczowe muszą być w języku polskim
- Muszą być w mianowniku
- Bądź konkretny i specyficzny
- Uwzględnij informacje o:
  * co się stało
  * gdzie się stało
  * kto był zaangażowany
  * jakie przedmioty/technologie się pojawiły
  * datę zdarzenia
  * numer/sekwencję raportu

Zwróć listę słów kluczowych oddzielonych przecinkami.`;

        const response = await this.sendPromptWithCache(prompt, cacheKey);
        return response.split(',').map(k => k.trim());
    }

    private async extractPeopleFromReport(content: string): Promise<Array<{firstName: string, lastName: string}>> {
        const cacheKey = `people_${content}`;
        const prompt = `
Wyodrębnij wszystkie nazwiska i imiona osób z poniższego raportu. Uwzględnij różne formy zapisu (np. "Jan Kowalski", "Kowalski Jan", "J. Kowalski").
Zwróć listę w formacie JSON, gdzie każda osoba to obiekt z polami "firstName" i "lastName".

RAPORT:
${content}

Odpowiedz tylko w formacie JSON, bez żadnego dodatkowego tekstu.`;

        const response = await this.sendPromptWithCache(prompt, cacheKey);
        return JSON.parse(response);
    }

    private findRelatedFacts(reportPeople: Array<{firstName: string, lastName: string}>, initialKeywords: string[]): ProcessedFact[] {
        return this.processedFacts.filter(fact => {
            // Check if any person from the report appears in the fact
            const hasMatchingPerson = fact.people.some(factPerson => 
                reportPeople.some(reportPerson => 
                    this.isSamePerson(factPerson, reportPerson)
                )
            );

            // Check if any location or keyword from the fact matches initial keywords
            const hasMatchingLocationOrKeyword = fact.locations.some(location =>
                initialKeywords.some(keyword => 
                    keyword.toLowerCase().includes(location.toLowerCase())
                )
            ) || fact.keywords.some(factKeyword =>
                initialKeywords.some(keyword =>
                    keyword.toLowerCase().includes(factKeyword.toLowerCase())
                )
            );

            return hasMatchingPerson || hasMatchingLocationOrKeyword;
        });
    }

    private isSamePerson(person1: {firstName: string, lastName: string}, person2: {firstName: string, lastName: string}): boolean {
        // Check for exact match
        if (person1.firstName === person2.firstName && person1.lastName === person2.lastName) {
            return true;
        }

        // Check for similar names (handling typos)
        const name1 = `${person1.firstName}${person1.lastName}`.toLowerCase();
        const name2 = `${person2.firstName}${person2.lastName}`.toLowerCase();

        // If names are very similar (allowing for typos), consider them the same person
        return this.calculateSimilarity(name1, name2) > 0.8;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance-based similarity
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1.0;
        return (maxLength - this.levenshteinDistance(str1, str2)) / maxLength;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private async generateFinalKeywords(
        content: string,
        filenameInfo: string,
        initialKeywords: string[],
        relatedFacts: ProcessedFact[]
    ): Promise<string> {
        const cacheKey = `final_keywords_${content}_${filenameInfo}_${initialKeywords.join('_')}_${relatedFacts.map(f => f.content).join('_')}`;
        const prompt = `
Wygeneruj końcową listę słów kluczowych, łącząc informacje z raportu i powiązanych faktów.

TREŚĆ RAPORTU:
${content}

INFORMACJE Z NAZWY PLIKU:
${filenameInfo}

WSTĘPNE SŁOWA KLUCZOWE:
${initialKeywords.join(', ')}

POWIĄZANE FAKTY:
${relatedFacts.map(fact => `
FAKT:
${fact.content}

WYODRĘBNIONE INFORMACJE:
- Osoby: ${fact.people.map(p => `${p.firstName} ${p.lastName}${p.role ? ` (${p.role})` : ''}`).join(', ')}
- Lokalizacje: ${fact.locations.join(', ')}
- Daty: ${fact.dates.join(', ')}
- Słowa kluczowe: ${fact.keywords.join(', ')}
`).join('\n')}

Wygeneruj listę słów kluczowych według następujących zasad:

PODSTAWOWE ZASADY:
- Słowa kluczowe muszą być w języku polskim
- Muszą być w mianowniku
- Słowa powinny być oddzielone przecinkami
- Każde słowo kluczowe powinno być istotne dla zrozumienia treści raportu

JAKOŚĆ SŁÓW KLUCZOWYCH:
- Bądź konkretny - używaj słów specyficznych dla danego raportu
- Unikaj zbyt ogólnych słów, chyba że są one kluczowe dla zrozumienia kontekstu
- Jeśli raport wspomina o konkretnych zwierzętach, użyj ogólnego słowa "zwierzęta"
- Uwzględnij nazwiska i imiona tylko jeśli są istotne dla kontekstu raportu
- Uwzględnij zawody i umiejętności osób z powiązanych faktów, jeśli są istotne
- Upewnij się, że słowa kluczowe są wystarczająco specyficzne, aby jednoznacznie identyfikować raport

DODATKOWE WSKAZÓWKI:
- Unikaj powtórzeń - jeśli kilka słów oznacza to samo, wybierz najbardziej precyzyjne
- Słów kluczowych może być dowolnie wiele
- Każde słowo kluczowe powinno być istotne dla zrozumienia treści raportu
- Upewnij się, że słowa kluczowe są wystarczająco specyficzne, aby jednoznacznie identyfikować raport

Odpowiedz tylko listą słów kluczowych oddzielonych przecinkami.`;

        const response = await this.sendPromptWithCache(prompt, cacheKey);
        const keywords = response.split(',').map(k => k.trim()).join(',');

        // Validate keywords
        if (!keywords || keywords.trim() === '') {
            throw new Error('Generated keywords are empty');
        }

        return keywords;
    }

    async loadReports(): Promise<Report[]> {
        try {
            if (!await fs.pathExists(this.reportsDir)) {
                console.log('No reports directory found');
                return [];
            }

            const files = await fs.readdir(this.reportsDir);
            const reports: Report[] = [];

            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const filePath = path.join(this.reportsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    
                    reports.push({
                        fileName: file,
                        content: content,
                        timestamp: this.extractTimestamp(content),
                        category: this.determineCategory(content)
                    });
                }
            }

            return reports;
        } catch (error) {
            console.error('Error loading reports:', error);
            throw error;
        }
    }

    async loadFacts(): Promise<string[]> {
        try {
            if (!await fs.pathExists(this.factsDir)) {
                console.log('No facts directory found');
                return [];
            }

            const files = await fs.readdir(this.factsDir);
            const facts: string[] = [];

            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const filePath = path.join(this.factsDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    facts.push(content);
                }
            }

            return facts;
        } catch (error) {
            console.error('Error loading facts:', error);
            throw error;
        }
    }

    private extractTimestamp(content: string): Date | undefined {
        const datePatterns = [
            /\d{4}-\d{2}-\d{2}/,  // YYYY-MM-DD
            /\d{2}\.\d{2}\.\d{4}/, // DD.MM.YYYY
            /\d{2}\/\d{2}\/\d{4}/  // DD/MM/YYYY
        ];

        for (const pattern of datePatterns) {
            const match = content.match(pattern);
            if (match) {
                try {
                    return new Date(match[0]);
                } catch {
                    continue;
                }
            }
        }

        return undefined;
    }

    private determineCategory(content: string): string | undefined {
        const categoryPatterns = [
            { pattern: /krytyczn[yi]|critical/i, category: 'critical' },
            { pattern: /ostrze[zż]eni[ae]|warning/i, category: 'warning' },
            { pattern: /informacj[ae]|info/i, category: 'info' }
        ];

        for (const { pattern, category } of categoryPatterns) {
            if (pattern.test(content)) {
                return category;
            }
        }

        return undefined;
    }

    private async analyzeFilename(filename: string): Promise<string> {
        try {
            const prompt = `
Przeanalizuj nazwę pliku raportu i wyodrębnij z niej wszystkie istotne informacje:
- datę (jeśli jest)
- numer/sekwencję raportu (jeśli jest)
- lokalizację/sektor (jeśli jest)
- typ raportu (jeśli jest)
- inne istotne informacje

NAZWA PLIKU:
${filename}

Zwróć analizę w formacie tekstowym, gdzie każda informacja jest w nowej linii.`;

            return await this.llmService.sendMessage(prompt);
        } catch (error) {
            console.error('Error analyzing filename:', error);
            return '';
        }
    }

    async handleCentralaError(errorMessage: string): Promise<void> {
        console.log('\nAnalyzing error message:', errorMessage);
        
        const cacheKey = `error_analysis_${errorMessage}`;
        const prompt = `
Przeanalizuj poniższy komunikat błędu i popraw poprzednią analizę raportów, aby uwzględnić wskazane problemy.

KOMUNIKAT BŁĘDU:
${errorMessage}

POPRZEDNIA ANALIZA RAPORTÓW:
${Object.entries(this.result.answer).map(([fileName, keywords]) => `
RAPORT: ${fileName}
SŁOWA KLUCZOWE: ${keywords}
`).join('\n')}

TREŚĆ RAPORTÓW:
${this.processedReports.map(report => `
RAPORT: ${report.fileName}
${report.content}
`).join('\n')}

Zadanie:
1. Przeanalizuj komunikat błędu i zidentyfikuj, czego brakuje w obecnej analizie
2. Przejrzyj treść raportów pod kątem brakujących informacji
3. Zaktualizuj słowa kluczowe dla raportów, które zawierają istotne informacje
4. Upewnij się, że słowa kluczowe są w języku polskim i w mianowniku
5. Zachowaj istniejące, poprawne słowa kluczowe

Odpowiedz w formacie:
{
    "updates": [
        {
            "report": "nazwa pliku raportu",
            "current_keywords": ["obecne", "słowa", "kluczowe"],
            "new_keywords": ["nowe", "słowa", "kluczowe"],
            "reason": "powód zmiany"
        }
    ]
}`;

        const response = await this.sendPromptWithCache(prompt, cacheKey);
        const analysis = JSON.parse(response);
        
        if (analysis.updates && analysis.updates.length > 0) {
            console.log('\nWprowadzono następujące zmiany:');
            for (const update of analysis.updates) {
                console.log(`\nRaport: ${update.report}`);
                console.log('Powód zmiany:', update.reason);
                console.log('Nowe słowa kluczowe:', update.new_keywords.join(', '));
                
                // Aktualizuj słowa kluczowe
                this.result.answer[update.report] = update.new_keywords.join(',');
            }
            
            // Zapisz zaktualizowane wyniki
            const analysisPath = path.join(this.reportsDir, '..', 'analysis_updated.json');
            await fs.writeJson(analysisPath, this.result, { spaces: 2 });
            console.log('\nZaktualizowane wyniki zapisano do:', analysisPath);
        } else {
            console.log('\nNie wprowadzono żadnych zmian w analizie.');
        }
    }
} 