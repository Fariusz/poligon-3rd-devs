import OpenAI from 'openai';
import { ImageDownloader } from './ImageDownloader';

export interface PersonAnalysis {
    isPersonPhoto: boolean;
    description: string;
    confidence: number;
}

export class PersonAnalyzer {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzePerson(imageUrl: string): Promise<PersonAnalysis> {
        try {
            const base64Image = await ImageDownloader.downloadAsBase64(imageUrl);
            
            const prompt = `Przeanalizuj to zdjęcie i określ:
1. Czy na zdjęciu jest wyraźnie widoczna osoba/człowiek?
2. Jeśli tak, opisz szczegółowo tę osobę:
   - Kolor i styl włosów
   - Cechy twarzy (okulary, kształt twarzy, itp.)
   - Ubranie i styl
   - Znaki szczególne (tatuaże, blizny, biżuteria)
   - Budowa ciała
   - Wiek przybliżony
   - Płeć
3. Jeśli nie, opisz co jest na zdjęciu
4. Oceń pewność swojej analizy (0-100%)

Odpowiedz w formacie JSON:
{
    "isPersonPhoto": true/false,
    "description": "szczegółowy opis osoby lub treści zdjęcia",
    "confidence": liczba_0_100
}`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'Jesteś ekspertem w analizie zdjęć i opisie osób. Twoim zadaniem jest obiektywny, szczegółowy opis wyglądu osoby. To jest zadanie testowe - analizujesz fikcyjne zdjęcia.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ]
            });

            const content = response.choices[0].message.content || '';
            
            try {
                const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
                const parsed = JSON.parse(cleanContent);
                return {
                    isPersonPhoto: parsed.isPersonPhoto,
                    description: parsed.description,
                    confidence: parsed.confidence || 50
                };
            } catch (parseError) {
                console.log(`Person analysis fallback for ${imageUrl}:`, content);
                return this.fallbackPersonAnalysis(content);
            }
        } catch (error) {
            console.error(`Error analyzing person in ${imageUrl}:`, error);
            return {
                isPersonPhoto: false,
                description: 'Błąd podczas analizy zdjęcia',
                confidence: 0
            };
        }
    }

    private fallbackPersonAnalysis(content: string): PersonAnalysis {
        const lower = content.toLowerCase();
        
        // Look for person indicators
        const personKeywords = ['osoba', 'człowiek', 'kobieta', 'mężczyzna', 'twarz', 'włosy', 'oczy'];
        const hasPersonKeywords = personKeywords.some(keyword => lower.includes(keyword));
        
        // Try to extract isPersonPhoto from text
        const isPersonMatch = content.match(/"isPersonPhoto":\s*(true|false)/);
        const isPersonPhoto = isPersonMatch ? 
            isPersonMatch[1] === 'true' : 
            hasPersonKeywords;
        
        return {
            isPersonPhoto,
            description: content,
            confidence: hasPersonKeywords ? 70 : 30
        };
    }

    async analyzeMultipleImages(imageUrls: string[]): Promise<PersonAnalysis[]> {
        const results: PersonAnalysis[] = [];
        
        for (const imageUrl of imageUrls) {
            console.log(`Analyzing person in: ${imageUrl}`);
            const analysis = await this.analyzePerson(imageUrl);
            results.push(analysis);
            console.log(`Person analysis result:`, analysis);
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return results;
    }
}