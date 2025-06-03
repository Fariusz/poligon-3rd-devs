import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const FEEDBACK_DIR = path.join(DATA_DIR, 'feedback');

// Create feedback directory if it doesn't exist
if (!fs.existsSync(FEEDBACK_DIR)) {
    fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
}

interface Feedback {
    questionNumber: string;
    incorrectAnswer: string;
    timestamp: string;
    context?: string;
}

/**
 * Saves feedback from Centrala
 */
export function saveFeedback(feedback: Feedback): void {
    const feedbackPath = path.join(FEEDBACK_DIR, `feedback_${feedback.questionNumber}.json`);
    fs.writeFileSync(feedbackPath, JSON.stringify(feedback, null, 2));
}

/**
 * Gets all feedback for a specific question
 */
export function getFeedbackForQuestion(questionNumber: string): Feedback[] {
    const feedbackPath = path.join(FEEDBACK_DIR, `feedback_${questionNumber}.json`);
    if (fs.existsSync(feedbackPath)) {
        return [JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'))];
    }
    return [];
}

/**
 * Gets all feedback
 */
export function getAllFeedback(): Feedback[] {
    const files = fs.readdirSync(FEEDBACK_DIR)
        .filter(file => file.startsWith('feedback_') && file.endsWith('.json'));
    
    return files.map(file => {
        const content = fs.readFileSync(path.join(FEEDBACK_DIR, file), 'utf-8');
        return JSON.parse(content);
    });
}

/**
 * Formats feedback into a context string
 */
export function formatFeedbackAsContext(feedback: Feedback[]): string {
    if (feedback.length === 0) return '';

    return feedback.map(f => {
        const parts = [
            `Previous incorrect answer for question ${f.questionNumber}:`,
            f.incorrectAnswer,
            f.context ? `Context: ${f.context}` : null,
            `Timestamp: ${f.timestamp}`
        ].filter(Boolean);

        return parts.join('\n');
    }).join('\n\n');
}

/**
 * Clears all feedback
 */
export function clearFeedback(): void {
    const files = fs.readdirSync(FEEDBACK_DIR);
    for (const file of files) {
        fs.unlinkSync(path.join(FEEDBACK_DIR, file));
    }
} 