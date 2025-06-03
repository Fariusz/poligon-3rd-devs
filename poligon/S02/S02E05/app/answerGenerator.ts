import * as fs from 'fs';
import * as path from 'path';
import { LLMService, Model } from '../../../shared/LLMService';
import { estimateTokens, truncateText, getModelTokenLimit } from './tokenManager';
import { getFeedbackForQuestion, formatFeedbackAsContext } from './feedbackManager';

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');

async function readQuestions(): Promise<string[]> {
    const questionsPath = path.join(OUTPUT_DIR, 'questions.txt');
    console.log('Reading questions from:', questionsPath);
    const content = fs.readFileSync(questionsPath, 'utf-8');
    const questions = content.split('\n').filter(q => q.trim());
    console.log('Found questions:', questions);
    return questions;
}

async function readContext(): Promise<string[]> {
    // Check if we have chunked content
    const indexPath = path.join(OUTPUT_DIR, 'combined_content_index.md');
    console.log('Checking for chunked content at:', indexPath);
    
    if (fs.existsSync(indexPath)) {
        // Read all chunks
        const chunks: string[] = [];
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        console.log('Found index file, reading chunks...');
        const chunkMatches = indexContent.match(/\[Part \d+\]\(combined_content_(\d+)\.md\)/g);
        
        if (chunkMatches) {
            for (const match of chunkMatches) {
                const chunkNum = match.match(/(\d+)/)?.[1];
                if (chunkNum) {
                    const chunkPath = path.join(OUTPUT_DIR, `combined_content_${chunkNum}.md`);
                    console.log('Reading chunk:', chunkPath);
                    chunks.push(fs.readFileSync(chunkPath, 'utf-8'));
                }
            }
        }
        console.log(`Read ${chunks.length} chunks from index`);
        return chunks;
    } else {
        // Read single content file
        const contentPath = path.join(OUTPUT_DIR, 'combined_content.md');
        console.log('No index file found, reading single content file:', contentPath);
        const content = fs.readFileSync(contentPath, 'utf-8');
        console.log('Read content file of length:', content.length);
        return [content];
    }
}

export async function generateAnswers(): Promise<void> {
    try {
        console.log('Starting answer generation...');
        const questions = await readQuestions();
        console.log(`Read ${questions.length} questions:`, questions);
        
        const contextChunks = await readContext();
        console.log(`Read ${contextChunks.length} context chunks`);
        
        // Initialize LLM service
        const llmService = new LLMService(
            'You are a helpful assistant that generates concise answers based on the provided context. ' +
            'Focus on accuracy and brevity. If the answer is not in the context, say so. ' +
            'If previous incorrect answers are provided, make sure to avoid similar mistakes.',
            Model.GPT4_MINI
        );
        
        // Get model token limit
        const modelLimit = getModelTokenLimit(Model.GPT4_MINI);
        console.log(`Model token limit: ${modelLimit}`);
        
        // Process each question
        const answers: { [key: string]: string } = {};
        
        for (const question of questions) {
            console.log(`\nProcessing question: ${question}`);
            
            // Extract question number
            const match = question.match(/^(\d+)=/);
            if (!match) {
                console.log('Could not extract question number, skipping...');
                continue;
            }
            
            const questionNum = match[1].padStart(2, '0');
            console.log(`Question number: ${questionNum}`);
            
            // Get feedback for this question
            const feedback = getFeedbackForQuestion(questionNum);
            const feedbackContext = formatFeedbackAsContext(feedback);
            if (feedbackContext) {
                console.log('Found feedback for this question');
            }
            
            // Try each context chunk until we get a good answer
            let bestAnswer = 'Answer not found in the provided context.';
            let highestConfidence = 0;
            
            for (const chunk of contextChunks) {
                console.log(`Trying context chunk of length ${chunk.length}...`);
                
                // Create prompt with context, feedback, and question
                const prompt = `Context:\n${chunk}\n\n` +
                    (feedbackContext ? `Previous Feedback:\n${feedbackContext}\n\n` : '') +
                    `Question: ${question}\n\n` +
                    'Please provide a concise answer based on the context. ' +
                    'If the answer is not in the context, say so. ' +
                    (feedbackContext ? 'Make sure to avoid previous mistakes.' : '');
                
                // Check if prompt fits within token limit
                const promptTokens = estimateTokens(prompt);
                console.log(`Prompt tokens: ${promptTokens}`);
                
                if (promptTokens > modelLimit) {
                    console.log(`Prompt exceeds token limit (${promptTokens} > ${modelLimit}). Truncating context...`);
                    const truncatedContext = truncateText(chunk, modelLimit - estimateTokens(question) - 100);
                    const truncatedPrompt = `Context:\n${truncatedContext}\n\n` +
                        (feedbackContext ? `Previous Feedback:\n${feedbackContext}\n\n` : '') +
                        `Question: ${question}\n\n` +
                        'Please provide a concise answer based on the context. ' +
                        'If the answer is not in the context, say so. ' +
                        (feedbackContext ? 'Make sure to avoid previous mistakes.' : '');
                    
                    const response = await llmService.sendMessage(truncatedPrompt);
                    const answer = response.trim();
                    console.log(`Got answer: ${answer}`);
                    
                    // Check if answer indicates it's not in the context
                    if (!answer.toLowerCase().includes('not found') && !answer.toLowerCase().includes('not in the context')) {
                        bestAnswer = answer;
                        highestConfidence = 1;
                        break;
                    }
                } else {
                    const response = await llmService.sendMessage(prompt);
                    const answer = response.trim();
                    console.log(`Got answer: ${answer}`);
                    
                    // Check if answer indicates it's not in the context
                    if (!answer.toLowerCase().includes('not found') && !answer.toLowerCase().includes('not in the context')) {
                        bestAnswer = answer;
                        highestConfidence = 1;
                        break;
                    }
                }
            }
            
            answers[questionNum] = bestAnswer;
            console.log(`Final answer for question ${questionNum}: ${bestAnswer}`);
        }
        
        // Save answers
        const answersPath = path.join(OUTPUT_DIR, 'answers.txt');
        const answersContent = Object.entries(answers)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([num, answer]) => `${num}. ${answer}`)
            .join('\n');
        
        console.log('\nSaving answers to file:', answersPath);
        console.log('Answers content:', answersContent);
        
        fs.writeFileSync(answersPath, answersContent);
        console.log('Answers generated and saved successfully!');
    } catch (error) {
        console.error('Error generating answers:', error);
        throw error;
    }
} 