export interface TestQuestion {
    q: string;
    a: string;
}

export interface Question {
    question: string;
    answer: number;
    test?: TestQuestion;
}

export interface ResponseData {
    apikey: string;
    description: string;
    copyright: string;
    "test-data": Question[];
}

export interface FinalResponse {
    task: string;
    apikey: string;
    answer: ResponseData;
} 