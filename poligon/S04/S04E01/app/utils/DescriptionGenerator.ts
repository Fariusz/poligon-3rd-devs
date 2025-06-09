import OpenAI from 'openai';
import { PersonAnalysis } from './PersonAnalyzer';

export interface DescriptionResult {
    description: string;
    confidence: number;
    photosAnalyzed: number;
}

export class DescriptionGenerator {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async createBarbaraDescription(
        personAnalyses: Array<{ filename: string; analysis: PersonAnalysis }>
    ): Promise<DescriptionResult> {
        try {
            console.log('Creating detailed Barbara description...');
            
            // Filter only images with people
            const validAnalyses = personAnalyses.filter(item => 
                item.analysis.isPersonPhoto && item.analysis.confidence > 50
            );
            
            if (validAnalyses.length === 0) {
                return {
                    description: "Nie udało się zidentyfikować Barbary na żadnym ze zdjęć.",
                    confidence: 0,
                    photosAnalyzed: 0
                };
            }
            
            console.log(`Creating description from ${validAnalyses.length} valid images`);
            
            // Create comprehensive description prompt
            const analysesText = validAnalyses.map((item, index) => 
                `Zdjęcie ${index + 1} (${item.filename}):\n${item.analysis.description}\n`
            ).join('\n');
            
            const prompt = `Na podstawie poniższych analiz zdjęć, stwórz szczegółowy rysopis Barbary w języku polskim.

ANALIZY ZDJĘĆ:
${analysesText}

ZADANIE:
Stwórz dokładny rysopis Barbary skupiając się na:
- Kolor włosów i fryzura (bardzo ważne!)
- Znaki szczególne (okulary, biżuteria, tatuaże, blizny)
- Charakterystyczne cechy twarzy
- Styl ubierania się
- Budowa ciała i wzrost
- Wiek przybliżony
- Inne charakterystyczne elementy wyglądu

WYMAGANIA:
- Rysopis w języku polskim
- Szczegółowy i konkretny opis
- Skupienie na trwałych cechach fizycznych
- Unikaj opisów sytuacyjnych (gdzie jest, co robi)
- Jeśli Barbara pojawia się na kilku zdjęciach, połącz informacje w spójny opis
- Zwróć szczególną uwagę na kolor włosów i znaki szczególne

FORMAT ODPOWIEDZI:
Odpowiedz tylko rysopisem w języku polskim, bez dodatkowych komentarzy lub nagłówków.`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'Jesteś ekspertem w tworzeniu szczegółowych rysopisów osób na podstawie analizy zdjęć. Twoim zadaniem jest stworzenie dokładnego, szczegółowego opisu wyglądu osoby. To jest zadanie testowe - zdjęcia nie przedstawiają prawdziwych osób. Skupiaj się na charakterystycznych cechach, szczególnie kolorze włosów i znakach szczególnych.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 1000
            });

            const description = response.choices[0].message.content || 'Nie udało się stworzyć rysopisu.';
            
            // Calculate average confidence
            const avgConfidence = validAnalyses.reduce((sum, item) => 
                sum + item.analysis.confidence, 0) / validAnalyses.length;
            
            console.log('Generated Barbara description:', description);
            
            return {
                description: description.trim(),
                confidence: Math.round(avgConfidence),
                photosAnalyzed: validAnalyses.length
            };
            
        } catch (error) {
            console.error('Error creating Barbara description:', error);
            return {
                description: 'Błąd podczas tworzenia rysopisu Barbary.',
                confidence: 0,
                photosAnalyzed: 0
            };
        }
    }

    async improveDescription(
        currentDescription: string, 
        hints: string[]
    ): Promise<string> {
        try {
            const prompt = `Masz do poprawienia rysopis Barbary. Otrzymałeś następujące wskazówki od systemu:

WSKAZÓWKI:
${hints.map((hint, index) => `${index + 1}. ${hint}`).join('\n')}

OBECNY RYSOPIS:
${currentDescription}

ZADANIE:
Ulepsz rysopis Barbary uwzględniając powyższe wskazówki. Skupiaj się szczególnie na:
- Dodaniu brakujących informacji o kolorze włosów
- Opisaniu znaków szczególnych
- Charakterystycznych cechach wyglądu

Odpowiedz tylko poprawionym rysopisem w języku polskim.`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'Jesteś ekspertem w poprawianiu rysopisów osób. Uwzględniaj otrzymane wskazówki i dodawaj brakujące szczegóły.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2
            });

            return response.choices[0].message.content?.trim() || currentDescription;
            
        } catch (error) {
            console.error('Error improving description:', error);
            return currentDescription;
        }
    }
}