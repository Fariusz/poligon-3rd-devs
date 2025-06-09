// Entry point for the episode

import { ApiService } from './services/api';
import { SearchAgent } from './services/searchAgent';
import { ReportService } from './services/reportService';
import { LLMService } from '@shared/LLMService';
import { ProcessedQuestion } from './types/questions';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
    const apiKey = process.env.PERSONAL_API_KEY;
    
    if (!apiKey) {
        throw new Error('PERSONAL_API_KEY not found in environment variables');
    }

    const apiService = new ApiService(apiKey);
    const llmService = new LLMService();
    const searchAgent = new SearchAgent(llmService);
    const reportService = new ReportService();

    try {
        // Fetch questions
        const questions = await apiService.fetchQuestions();
        console.log('Fetched questions:', questions);

        // Process each question
        for (const [id, questionText] of Object.entries(questions)) {
            const question: ProcessedQuestion = {
                id,
                question: questionText
            };

            console.log(`\nProcessing question ${id}: ${question.question}`);
            
            const result = await searchAgent.searchForAnswer(question);
            reportService.addAnswer(result);
            
            console.log('Search result:', {
                questionId: result.questionId,
                answer: result.answer,
                path: result.path
            });
        }

        // Generate and display final report
        console.log('\n' + reportService.generateReport());

        // Send report to Centrala
        console.log('\nSending report to Centrala...');
        await reportService.sendReport(apiKey);
        console.log('Report sent successfully!');

    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error occurred');
    }
}

// Run the main function
main().catch(console.error); 