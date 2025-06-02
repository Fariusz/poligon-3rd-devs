// Entry point for the episode

import { downloadFile, extractZipFile } from './fileManager';
import { TextAnalyzer } from './textAnalyzer';
import { ImageAnalyzer } from './imageAnalyzer';
import { AudioAnalyzer } from './audioAnalyzer';
import { GeneralAnalyzer } from './generalAnalyzer';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    try {
        // Download and extract files
        await downloadFile();
        await extractZipFile();

        const textDir = path.join(__dirname, '../data/pliki_z_fabryki/text');
        const audioDir = path.join(__dirname, '../data/pliki_z_fabryki/audio');
        const imagesDir = path.join(__dirname, '../data/pliki_z_fabryki/images');
        
        // Initialize analyzers
        const textAnalyzer = new TextAnalyzer();
        const imageAnalyzer = new ImageAnalyzer();
        const audioAnalyzer = new AudioAnalyzer();
        const generalAnalyzer = new GeneralAnalyzer();
    
        console.log('Analyzing image files...');
        const imageResults = await imageAnalyzer.analyzeImages(imagesDir);
        console.log('Image analysis complete.');

        console.log('Analyzing audio files...');
        const audioResults = await audioAnalyzer.analyzeAudioFiles(audioDir);
        console.log('Audio analysis complete.');

        console.log('Analyzing text files...');
        const textResults = await textAnalyzer.analyzeTextFiles(textDir);
        console.log('Text analysis complete.');

        // Process results from output directory
        console.log('Categorizing files from output directory...');
        const categorizedFiles = await generalAnalyzer.analyzeFiles();
        console.log('Categorized files:', categorizedFiles);

        // Send the report
        console.log('Sending report to Centrala...');
        await reportJsonToCentrala(categorizedFiles, "kategorie");
        console.log('Report sent successfully.');

    } catch (error) {
        console.error('Error in main process:', error);
        process.exit(1);
    }
}

// Execute the main function
main(); 