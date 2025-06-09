export interface SearchState {
    currentUrl: string;
    visitedUrls: Set<string>;
    depth: number;
    maxDepth: number;
}

export interface SearchResult {
    questionId: string;
    answer: string;
    path: string[];
}

export interface LLMResponse {
    hasAnswer: boolean;
    answer?: string;
    nextUrl?: string;
} 