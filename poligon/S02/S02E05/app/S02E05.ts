// Entry point for the episode

import * as dotenv from 'dotenv';
import * as path from 'path';
import { downloadData } from './dataDownloader';
import { downloadQuestions } from './questionDownloader';
import { processHtmlToText } from './textProcessor';
import { processImages } from './imageProcessor';
import { processAudio } from './audioProcessor';
import { combineContent } from './contentCombiner';
import { generateAnswers } from './answerGenerator';
import { sendAnswersToCentrala } from './answerSender';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

async function main() {
    try {
        // Download all data
        await downloadData();
        
        // Download questions from Centrala
        await downloadQuestions();
        
        // Process HTML to clean text
        await processHtmlToText();
        
        // Process images with LLM Vision
        await processImages();
        
        // Process audio files with Whisper
        await processAudio();
        
        // Combine all content into a single Markdown file
        await combineContent();
        
        // Generate answers to questions
        await generateAnswers();
        
        // Send answers to Centrala
        await sendAnswersToCentrala();
        
        console.log('All processing completed successfully!');
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

// Execute the main function
main(); 