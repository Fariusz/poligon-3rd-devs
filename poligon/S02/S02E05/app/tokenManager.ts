import { LLMService, Model } from '../../../shared/LLMService';

// Approximate tokens per word (English)
const TOKENS_PER_WORD = 1.3;
// Approximate tokens per character (English)
const TOKENS_PER_CHAR = 0.25;

// Model token limits
const MODEL_LIMITS = {
    [Model.GPT4_MINI]: 128000,
    [Model.GPT4o]: 128000,
    [Model.GPT4_1]: 128000,
    [Model.DALL_E]: 4000,
    [Model.WHISPER]: 4000
};

export function estimateTokens(text: string): number {
    // Count words and characters
    const words = text.split(/\s+/).length;
    const chars = text.length;
    
    // Use the more conservative estimate
    return Math.max(
        Math.ceil(words * TOKENS_PER_WORD),
        Math.ceil(chars * TOKENS_PER_CHAR)
    );
}

export function chunkText(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
        const paragraphTokens = estimateTokens(paragraph);
        
        // If single paragraph is too long, split it into sentences
        if (paragraphTokens > maxTokens) {
            const sentences = paragraph.split(/[.!?]+\s+/);
            let currentSentenceChunk = '';
            let currentSentenceTokens = 0;
            
            for (const sentence of sentences) {
                const sentenceTokens = estimateTokens(sentence);
                
                if (currentSentenceTokens + sentenceTokens > maxTokens) {
                    if (currentSentenceChunk) {
                        chunks.push(currentSentenceChunk.trim());
                        currentSentenceChunk = '';
                        currentSentenceTokens = 0;
                    }
                    
                    // If single sentence is too long, split it into words
                    if (sentenceTokens > maxTokens) {
                        const words = sentence.split(/\s+/);
                        let currentWordChunk = '';
                        let currentWordTokens = 0;
                        
                        for (const word of words) {
                            const wordTokens = estimateTokens(word);
                            
                            if (currentWordTokens + wordTokens > maxTokens) {
                                if (currentWordChunk) {
                                    chunks.push(currentWordChunk.trim());
                                    currentWordChunk = '';
                                    currentWordTokens = 0;
                                }
                            }
                            
                            currentWordChunk += (currentWordChunk ? ' ' : '') + word;
                            currentWordTokens += wordTokens;
                        }
                        
                        if (currentWordChunk) {
                            chunks.push(currentWordChunk.trim());
                        }
                    } else {
                        chunks.push(sentence.trim());
                    }
                } else {
                    currentSentenceChunk += (currentSentenceChunk ? ' ' : '') + sentence;
                    currentSentenceTokens += sentenceTokens;
                }
            }
            
            if (currentSentenceChunk) {
                chunks.push(currentSentenceChunk.trim());
            }
        } else if (currentTokens + paragraphTokens > maxTokens) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
            currentTokens = paragraphTokens;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            currentTokens += paragraphTokens;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

export function truncateText(text: string, maxTokens: number): string {
    const tokens = estimateTokens(text);
    if (tokens <= maxTokens) {
        return text;
    }
    
    // Try to find a good breaking point
    const words = text.split(/\s+/);
    let truncatedText = '';
    let currentTokens = 0;
    
    for (const word of words) {
        const wordTokens = estimateTokens(word);
        if (currentTokens + wordTokens > maxTokens) {
            break;
        }
        truncatedText += (truncatedText ? ' ' : '') + word;
        currentTokens += wordTokens;
    }
    
    return truncatedText + '...';
}

export function getModelTokenLimit(model: Model): number {
    return MODEL_LIMITS[model] || 4000; // Default to 4000 if model not found
} 