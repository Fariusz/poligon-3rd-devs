import * as fs from 'fs-extra';
import * as path from 'path';
import { client, COLLECTION_NAME, generatePointId } from './qdrant';
import { LLMService } from '@shared/LLMService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

interface Report {
    fileName: string;
    content: string;
    date: string;
}

// Metadata type that matches Qdrant's requirements
type ReportMetadata = {
    fileName: string;
    date: string;  // YYYY-MM-DD format
    content: string;
    indexedAt: string;  // ISO timestamp of when the report was indexed
    [key: string]: unknown;  // Allow additional string keys
}

export class ReportProcessor {
    private readonly llmService: LLMService;
    private readonly dataDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
        this.llmService = new LLMService();
    }

    private async getEmbedding(text: string): Promise<number[]> {
        try {
            return await this.llmService.getEmbedding(text);
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    private validateDate(dateStr: string): boolean {
        // Check if the string matches YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
            return false;
        }

        // Parse the date and check if it's valid
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime());
    }

    private extractDateFromFileName(fileName: string): string {
        // Extract date from filename (e.g., 2024_02_21.txt)
        const dateMatch = fileName.match(/^(\d{4})_(\d{2})_(\d{2})/);
        if (!dateMatch) {
            throw new Error(`Could not extract date from filename: ${fileName}`);
        }

        // Convert to YYYY-MM-DD format
        const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

        // Validate the extracted date
        if (!this.validateDate(date)) {
            throw new Error(`Invalid date format in filename: ${fileName}. Expected YYYY_MM_DD format.`);
        }

        console.log(`Extracted date ${date} from filename: ${fileName}`);
        return date;
    }

    private async processReport(filePath: string): Promise<Report> {
        const fileName = path.basename(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const date = this.extractDateFromFileName(fileName);

        return {
            fileName,
            content,
            date
        };
    }

    private createMetadata(report: Report): ReportMetadata {
        return {
            fileName: report.fileName,
            date: report.date,  // YYYY-MM-DD format
            content: report.content,
            indexedAt: new Date().toISOString()
        };
    }

    private async indexReport(report: Report): Promise<void> {
        try {
            // Generate embedding for the report content
            const embedding = await this.getEmbedding(report.content);

            // Create metadata with the report date prominently featured
            const metadata = this.createMetadata(report);

            // Prepare point data for Qdrant
            const point = {
                id: generatePointId(),
                vector: embedding,
                payload: metadata
            };

            // Upsert the point to Qdrant
            await client.upsert(COLLECTION_NAME, {
                points: [point]
            });

            console.log(`Successfully indexed report: ${report.fileName}`);
            console.log(`Metadata: Date=${metadata.date}, IndexedAt=${metadata.indexedAt}`);
        } catch (error) {
            console.error(`Error indexing report ${report.fileName}:`, error);
            throw error;
        }
    }

    async processReports(): Promise<void> {
        try {
            // Ensure directory exists
            if (!await fs.pathExists(this.dataDir)) {
                throw new Error(`Reports directory not found: ${this.dataDir}`);
            }

            // Get all .txt files
            const files = await fs.readdir(this.dataDir);
            const reportFiles = files.filter(file => file.endsWith('.txt'));

            console.log(`Found ${reportFiles.length} report files to process`);

            // Process each report
            for (const file of reportFiles) {
                const filePath = path.join(this.dataDir, file);
                try {
                    const report = await this.processReport(filePath);
                    await this.indexReport(report);
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    // Continue with next file even if one fails
                }
            }

            console.log('All reports processed successfully');
        } catch (error) {
            console.error('Error in processReports:', error);
            throw error;
        }
    }
} 