export interface Question {
    id: string;
    question: string;
    answer?: string;
}

export interface QuestionsResponse {
    [key: string]: string;
}

export interface ProcessedQuestion {
    id: string;
    question: string;
    answer?: string;
} 