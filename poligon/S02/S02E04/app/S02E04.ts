// Entry point for the episode

import { downloadFile, extractZipFile } from './fileManager';
import { AudioAnalyzer } from './audioAnalyzer';
import { ImageAnalyzer } from './imageAnalyzer';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import { LLMService, Model } from '../../../shared/LLMService';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Global model configuration
const MODEL = Model.GPT4_1;

// Constants for prompts
const PROMPTS = {
    PEOPLE: "czy tekst zawiera informacje o schwytanych ludziach lub o śladach ich obecności? odpowiedz tak lub nie",
    HARDWARE: "czy tekst zawiera informacje o usterkach sprzetowych (hardwarowych), odpowiedz tak lub nie"
};

async function checkContent(llmService: LLMService, content: string): Promise<{ hasPeople: boolean; hasHardware: boolean }> {
    const peopleResult = await llmService.sendMessage(content, PROMPTS.PEOPLE, MODEL);
    const hardwareResult = await llmService.sendMessage(content, PROMPTS.HARDWARE, MODEL);
    
    return {
        hasPeople: peopleResult.toLowerCase().includes('tak'),
        hasHardware: hardwareResult.toLowerCase().includes('tak')
    };
}

async function processTextFiles(textDir: string, llmService: LLMService): Promise<{ people: string[]; hardware: string[] }> {
    const people: string[] = [];
    const hardware: string[] = [];
    
    const textFiles = fs.readdirSync(textDir);
    for (const file of textFiles) {
        const content = fs.readFileSync(path.join(textDir, file), 'utf-8');
        const result = await checkContent(llmService, content);
        
        if (result.hasPeople) people.push(file);
        if (result.hasHardware) hardware.push(file);
    }
    
    return { people, hardware };
}

async function processAudioFiles(audioDir: string, llmService: LLMService, audioAnalyzer: AudioAnalyzer): Promise<{ people: string[]; hardware: string[] }> {
    const people: string[] = [];
    const hardware: string[] = [];
    
    const audioFiles = fs.readdirSync(audioDir);
    for (const file of audioFiles) {
        const audioText = await audioAnalyzer.analyzeAudio(path.join(audioDir, file));
        const result = await checkContent(llmService, audioText);
        
        if (result.hasPeople) people.push(file);
        if (result.hasHardware) hardware.push(file);
    }
    
    return { people, hardware };
}

async function processImageFiles(imagesDir: string, llmService: LLMService, imageAnalyzer: ImageAnalyzer): Promise<{ people: string[]; hardware: string[] }> {
    const people: string[] = [];
    const hardware: string[] = [];
    
    const imageFiles = fs.readdirSync(imagesDir);
    const imageTexts = await imageAnalyzer.analyzeImages(imagesDir);
    
    for (const file of imageFiles) {
        const imageAnalysis = imageTexts.get(file);
        if (imageAnalysis) {
            const result = await checkContent(llmService, imageAnalysis);
            
            if (result.hasPeople) people.push(file);
            if (result.hasHardware) hardware.push(file);
        }
    }
    
    return { people, hardware };
}

async function main() {
    try {
        // Download and extract files
        await downloadFile();
        await extractZipFile();

        const textDir = path.join(__dirname, '../data/pliki_z_fabryki/text');
        const audioDir = path.join(__dirname, '../data/pliki_z_fabryki/audio');
        const imagesDir = path.join(__dirname, '../data/pliki_z_fabryki/images');
        
        // Initialize services
        const imageAnalyzer = new ImageAnalyzer();
        const audioAnalyzer = new AudioAnalyzer();
        const llmService = new LLMService("", MODEL);

        // Process all file types
        console.log('Processing text files...');
        const textResults = await processTextFiles(textDir, llmService);
        
        console.log('Processing audio files...');
        const audioResults = await processAudioFiles(audioDir, llmService, audioAnalyzer);
        
        console.log('Processing image files...');
        const imageResults = await processImageFiles(imagesDir, llmService, imageAnalyzer);

        // Combine and deduplicate results
        const allPeople = [...textResults.people, ...audioResults.people, ...imageResults.people];
        const allHardware = [...textResults.hardware, ...audioResults.hardware, ...imageResults.hardware];

        const uniquePeople = [...new Set(allPeople)].sort();
        const uniqueHardware = [...new Set(allHardware)].sort();

        // Prepare and send report
        const reportData = {
            task: "kategorie",
            apikey: process.env.PERSONAL_API_KEY,
            people: uniquePeople,
            hardware: uniqueHardware
        };

        console.log('Prepared report data:', reportData);
        console.log('Sending report to Centrala...');
        await reportJsonToCentrala(reportData, "kategorie");
        console.log('Report sent successfully.');

    } catch (error: any) {
        if (error.response?.data?.message) {
            console.error('Error:', error.response.data.message);
        } else {
            console.error('Error in main process:', error);
        }
        process.exit(1);
    }
}

// Execute the main function
main(); 