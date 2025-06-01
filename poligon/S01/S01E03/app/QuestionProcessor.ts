import { LLMService, Model } from '../../../shared/LLMService';
import { Question } from './types';

export class QuestionProcessor {
    private llmService: LLMService;

    constructor() {
        this.llmService = new LLMService('Answer the questions with shortest possible answer.', Model.GPT4_MINI);
    }

    async processSpecialQuestions(questions: Question[]): Promise<void> {
        console.log('\n=== CHECKING FOR SPECIAL TEST STRUCTURE ===');
        let foundSpecial = false;
        
        for (const q of questions) {
            if (q.test && q.test.q && q.test.a) {
                foundSpecial = true;
                console.log('📝 Special question:', q.test.q);
                
                // Get answer from GPT
                const gptAnswer = await this.llmService.sendShortAnswer(q.test.q);
                console.log('🤖 GPT answer:', gptAnswer);
                
                // Update the answer in the question
                q.test.a = gptAnswer;
            }
        }
        
        if (!foundSpecial) {
            console.log('No special test structure found in the questions.\n');
        }
    }

    processEquations(questions: Question[]): { correctCount: number; incorrectCount: number } {
        console.log('\n=== CORRECTED ANSWERS ===');
        let correctCount = 0;
        let incorrectCount = 0;
        
        questions.forEach((q, index) => {
            // Remove any whitespace and evaluate the equation
            const equation = q.question.replace(/\s+/g, '');
            const correctAnswer = eval(equation);
            
            if (q.answer !== correctAnswer) {
                console.log(`\nQuestion ${index + 1}:`);
                console.log(`Equation: ${q.question}`);
                console.log(`Original answer: ${q.answer}`);
                console.log(`Corrected answer: ${correctAnswer}`);
                incorrectCount++;
                // Update the answer in the questions array
                q.answer = correctAnswer;
            } else {
                correctCount++;
            }
        });
        
        console.log('\n=== SUMMARY ===');
        console.log(`Total questions: ${questions.length}`);
        console.log(`Correct answers: ${correctCount}`);
        console.log(`Incorrect answers: ${incorrectCount}`);

        return { correctCount, incorrectCount };
    }
} 