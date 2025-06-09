import OpenAI from 'openai';
import { ImageDownloader } from './ImageDownloader';

export interface QualityAnalysis {
    quality: 'good' | 'dark' | 'bright' | 'corrupted';
    suggestion: 'REPAIR' | 'DARKEN' | 'BRIGHTEN' | 'NONE';
    reasoning: string;
}

export class ImageQualityAnalyzer {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeQuality(imageUrl: string): Promise<QualityAnalysis> {
        try {
            const base64Image = await ImageDownloader.downloadAsBase64(imageUrl);
            
            const prompt = `Analyze this image and determine its quality:
1. Is it corrupted, glitchy, or has noise/artifacts? -> suggest REPAIR
2. Is it too dark to see details clearly? -> suggest BRIGHTEN  
3. Is it too bright/overexposed? -> suggest DARKEN
4. Is it good quality? -> suggest NONE

Respond in JSON format:
{
    "quality": "good|dark|bright|corrupted",
    "suggestion": "REPAIR|DARKEN|BRIGHTEN|NONE",
    "reasoning": "brief explanation"
}`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at analyzing image quality. Be concise and practical in your recommendations.'
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
                    quality: parsed.quality,
                    suggestion: parsed.suggestion,
                    reasoning: parsed.reasoning || 'No reasoning provided'
                };
            } catch (parseError) {
                console.log(`Quality analysis fallback for ${imageUrl}:`, content);
                return this.fallbackAnalysis(content);
            }
        } catch (error) {
            console.error(`Error evaluating quality for ${imageUrl}:`, error);
            return { 
                quality: 'corrupted', 
                suggestion: 'REPAIR',
                reasoning: 'Error during analysis'
            };
        }
    }

    private fallbackAnalysis(content: string): QualityAnalysis {
        const lower = content.toLowerCase();
        
        if (lower.includes('corrupt') || lower.includes('noise') || lower.includes('glitch')) {
            return { quality: 'corrupted', suggestion: 'REPAIR', reasoning: 'Detected corruption or noise' };
        } else if (lower.includes('dark') || lower.includes('underexposed')) {
            return { quality: 'dark', suggestion: 'BRIGHTEN', reasoning: 'Image appears too dark' };
        } else if (lower.includes('bright') || lower.includes('overexposed')) {
            return { quality: 'bright', suggestion: 'DARKEN', reasoning: 'Image appears too bright' };
        } else {
            return { quality: 'good', suggestion: 'NONE', reasoning: 'Image appears to be good quality' };
        }
    }
}