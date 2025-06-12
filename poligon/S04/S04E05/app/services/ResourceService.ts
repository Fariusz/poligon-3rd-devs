import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { FileDownloadService } from './FileDownloadService';

export class ResourceService {
    private readonly fileDownloadService: FileDownloadService;
    private readonly dataDir: string;
    private readonly inputDir: string;

    constructor() {
        this.fileDownloadService = new FileDownloadService();
        this.dataDir = path.join(__dirname, '../../data');
        this.inputDir = path.join(this.dataDir, 'input');
        
        // Create directories if they don't exist
        if (!fs.existsSync(this.inputDir)) {
            fs.mkdirSync(this.inputDir, { recursive: true });
        }
    }

    async downloadResources(): Promise<void> {
        const pdfPath = path.join(this.inputDir, 'notatnik-rafala.pdf');
        const jsonPath = path.join(this.inputDir, 'notes.json');

        // Download PDF file
        const pdfUrl = 'https://c3ntrala.ag3nts.org/dane/notatnik-rafala.pdf';
        await this.fileDownloadService.downloadFile(pdfUrl, pdfPath);

        // Download JSON file
        const jsonUrl = 'https://c3ntrala.ag3nts.org/data/TUTAJ-KLUCZ/notes.json';
        await this.fileDownloadService.downloadFile(jsonUrl, jsonPath);
    }
} 