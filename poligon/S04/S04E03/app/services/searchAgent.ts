import { LLMService, Model } from '@shared/LLMService';
import { WebService } from './webService';
import { SearchState, SearchResult } from '../types/search';
import { ProcessedQuestion } from '../types/questions';

export class SearchAgent {
    private readonly llmService: LLMService;
    private readonly webService: WebService;
    private readonly maxDepth: number;
    private readonly maxPagesPerQuestion: number;
    private visitedUrls: Map<string, Set<string>>; // Map of question IDs to sets of visited URLs
    private pageCounts: Map<string, number>; // Map of question IDs to number of pages visited

    constructor(
        llmService: LLMService, 
        maxDepth: number = 3,
        maxPagesPerQuestion: number = 10
    ) {
        this.llmService = llmService;
        this.webService = new WebService();
        this.maxDepth = maxDepth;
        this.maxPagesPerQuestion = maxPagesPerQuestion;
        this.visitedUrls = new Map();
        this.pageCounts = new Map();
    }

    private async analyzePageContent(content: string, question: ProcessedQuestion): Promise<{
        hasAnswer: boolean;
        answer?: string;
        relevantLinks?: string[];
    }> {
        const prompt = `
            You are a precise web content analyzer using GPT-4.1-mini. Your task is to:
            1. Determine if the page contains the exact answer to the question
            2. If yes, extract ONLY the specific information requested
            3. If no, identify the SINGLE most promising link for finding the answer

            Question: ${question.question}

            Page content:
            ${content}

            Respond with a JSON object:
            {
                "hasAnswer": boolean,
                "answer": string (ONLY if hasAnswer is true, provide the exact information without any additional text),
                "relevantLinks": string[] (ONLY if hasAnswer is false, provide exactly one most promising link)
            }

            Rules:
            - For answers: Provide ONLY the exact information requested (e.g., just the email, number, or name)
            - For links: Choose the SINGLE most promising link that might contain the answer
            - Be extremely concise in your response
            - Do not include any explanatory text or formatting
            - If the answer is not found, return hasAnswer: false and provide the most relevant link
        `;

        try {
            const response = await this.llmService.sendMessage(
                prompt,
                'You are a precise web content analyzer. Provide only the exact information requested, without any additional text or formatting.',
                Model.GPT4_MINI
            );
            const result = JSON.parse(response);
            
            // Clean up the answer if it exists
            if (result.hasAnswer && result.answer) {
                // Remove any common prefixes or explanatory text
                result.answer = result.answer
                    .replace(/^(?:answer|result|value|information|data|the|a|an):\s*/i, '')
                    .replace(/^(?:the|a|an)\s+/i, '')
                    .trim();
            }
            
            // Ensure we only have one link if no answer is found
            if (!result.hasAnswer && result.relevantLinks) {
                result.relevantLinks = [result.relevantLinks[0]];
            }
            
            return result;
        } catch (error) {
            console.error('Error parsing LLM response:', error);
            return { hasAnswer: false };
        }
    }

    private getVisitedUrlsForQuestion(questionId: string): Set<string> {
        if (!this.visitedUrls.has(questionId)) {
            this.visitedUrls.set(questionId, new Set());
        }
        return this.visitedUrls.get(questionId)!;
    }

    private isUrlVisited(questionId: string, url: string): boolean {
        const visitedUrls = this.getVisitedUrlsForQuestion(questionId);
        return visitedUrls.has(url);
    }

    private markUrlAsVisited(questionId: string, url: string): void {
        const visitedUrls = this.getVisitedUrlsForQuestion(questionId);
        visitedUrls.add(url);
        
        // Increment page count for this question
        const currentCount = this.pageCounts.get(questionId) || 0;
        this.pageCounts.set(questionId, currentCount + 1);
    }

    private getPageCount(questionId: string): number {
        return this.pageCounts.get(questionId) || 0;
    }

    private hasReachedPageLimit(questionId: string): boolean {
        return this.getPageCount(questionId) >= this.maxPagesPerQuestion;
    }

    async searchForAnswer(question: ProcessedQuestion): Promise<SearchResult> {
        // Reset page count for this question
        this.pageCounts.set(question.id, 0);

        const state: SearchState = {
            currentUrl: 'https://softo.ag3nts.org',
            visitedUrls: this.getVisitedUrlsForQuestion(question.id),
            depth: 0,
            maxDepth: this.maxDepth
        };

        const path: string[] = [state.currentUrl];

        while (state.depth < state.maxDepth) {
            // Check if we've reached the page limit
            if (this.hasReachedPageLimit(question.id)) {
                console.log(`Reached maximum page limit (${this.maxPagesPerQuestion}) for question ${question.id}`);
                break;
            }

            if (this.isUrlVisited(question.id, state.currentUrl)) {
                console.log(`Already visited ${state.currentUrl}, skipping...`);
                break;
            }

            console.log(`\nVisiting: ${state.currentUrl} (Page ${this.getPageCount(question.id) + 1}/${this.maxPagesPerQuestion})`);
            this.markUrlAsVisited(question.id, state.currentUrl);
            
            try {
                const { markdown, links } = await this.webService.getPageContent(state.currentUrl);
                console.log(`Found ${links.length} links on the page`);

                // Filter out already visited links
                const unvisitedLinks = links.filter(link => !this.isUrlVisited(question.id, link));
                console.log(`${unvisitedLinks.length} unvisited links remaining`);

                // Analyze page content and get relevant links
                const analysis = await this.analyzePageContent(markdown, question);
                
                if (analysis.hasAnswer && analysis.answer) {
                    console.log('Found answer on current page!');
                    return {
                        questionId: question.id,
                        answer: analysis.answer,
                        path
                    };
                }

                // Get the single most promising link that hasn't been visited
                const nextLinks = (analysis.relevantLinks || [])
                    .filter(link => !this.isUrlVisited(question.id, link));

                if (nextLinks.length === 0) {
                    console.log('No unvisited relevant links found, stopping search');
                    break;
                }

                const nextUrl = nextLinks[0];
                if (!nextUrl) {
                    console.log('No next URL available, stopping search');
                    break;
                }

                state.currentUrl = nextUrl;
                path.push(nextUrl);
                state.depth++;
            } catch (error) {
                console.error(`Error processing ${state.currentUrl}:`, error);
                break;
            }
        }

        return {
            questionId: question.id,
            answer: "No answer found within the maximum depth limit.",
            path
        };
    }
} 