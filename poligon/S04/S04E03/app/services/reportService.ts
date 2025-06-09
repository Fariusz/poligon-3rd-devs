import { SearchResult } from '../types/search';
import { reportJsonToCentrala } from '@shared/centralaReporter';

export class ReportService {
    private answers: Map<string, SearchResult> = new Map();

    addAnswer(result: SearchResult) {
        this.answers.set(result.questionId, result);
    }

    generateReport(): string {
        const report: string[] = [];
        report.push('=== Raport końcowy ===\n');

        // Sort questions by ID to ensure consistent order
        const sortedIds = Array.from(this.answers.keys()).sort();
        
        for (const id of sortedIds) {
            const result = this.answers.get(id);
            if (result) {
                report.push(`Pytanie ${id}:`);
                report.push(`Odpowiedź: ${result.answer}`);
                report.push(`Ścieżka: ${result.path.join(' -> ')}`);
                report.push(''); // Empty line for readability
            }
        }

        return report.join('\n');
    }

    hasAllAnswers(): boolean {
        return this.answers.size === 3 && 
               this.answers.has('01') && 
               this.answers.has('02') && 
               this.answers.has('03');
    }

    async sendReport(apiKey: string): Promise<void> {
        if (!this.hasAllAnswers()) {
            throw new Error('Cannot send report: not all questions have been answered');
        }

        const answer: { [key: string]: string } = {};
        for (const [id, result] of this.answers.entries()) {
            answer[id] = result.answer;
        }

        const report = {
            task: 'softo',
            apikey: apiKey,
            answer
        };

        await reportJsonToCentrala(report);
    }
} 