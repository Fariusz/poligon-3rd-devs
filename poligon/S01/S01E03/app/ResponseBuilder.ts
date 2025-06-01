import { ResponseData, FinalResponse } from './types';

export class ResponseBuilder {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    buildFinalResponse(responseData: ResponseData): FinalResponse {
        return {
            task: "JSON",
            apikey: this.apiKey,
            answer: {
                ...responseData,
                apikey: this.apiKey
            }
        };
    }
} 