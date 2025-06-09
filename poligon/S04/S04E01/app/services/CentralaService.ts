import axios from 'axios';
import { ImageDownloader } from '../utils/ImageDownloader';

export interface CentralaResponse {
    code: number;
    message: string;
    hints?: string[];
}

export class CentralaService {
    private apiKey: string;
    private baseUrl = 'https://c3ntrala.ag3nts.org';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getPhotoUrls(): Promise<string[]> {
        try {
            console.log('Getting photo URLs from Centrala...');
            const response = await axios.post(`${this.baseUrl}/report`, {
                task: "photos",
                apikey: this.apiKey,
                answer: "START"
            });

            console.log('Initial Response:', response.data);

            if (response.data && response.data.message) {
                return this.extractImageUrls(response.data.message);
            }

            return [];
        } catch (error) {
            console.error('Error getting photo URLs from Centrala:', error);
            throw error;
        }
    }

    async reportDescription(description: string): Promise<CentralaResponse> {
        try {
            console.log('Sending Barbara description to Centrala...');
            console.log('Description length:', description.length);
            
            const response = await axios.post(`${this.baseUrl}/report`, {
                task: "photos",
                apikey: this.apiKey,
                answer: description
            });

            console.log('Final Report Response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('Error reporting description to Centrala:');
            if (error.response?.data) {
                console.error('API Error Response:', error.response.data);
                if (error.response.data.hints) {
                    console.error('Hints:', error.response.data.hints);
                }
                // Return the error response so we can handle hints
                return error.response.data;
            }
            console.error('Full error:', error.message);
            throw error;
        }
    }

    private extractImageUrls(message: string): string[] {
        // First try to find complete URLs
        const urlRegex = /https:\/\/centrala\.ag3nts\.org\/dane\/barbara\/[^\s]+\.PNG/g;
        const completeUrls = message.match(urlRegex);
        
        if (completeUrls && completeUrls.length > 0) {
            return completeUrls;
        }
        
        // If no complete URLs found, extract filenames and build URLs
        const filenameRegex = /IMG_\d+\.PNG/g;
        const filenames = message.match(filenameRegex) || [];
        
        return filenames.map(filename => ImageDownloader.buildImageUrl(filename));
    }

    extractFilenamesFromUrls(imageUrls: string[]): string[] {
        return imageUrls.map(url => ImageDownloader.extractFilenameFromUrl(url));
    }
}