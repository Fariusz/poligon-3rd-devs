// Entry point for the episode

import * as path from 'path';
import { ZipProcessor } from './zipProcessor';
import { ReportProcessor } from './reportProcessor';
import { reportJsonToCentrala, setReportProcessor } from '../../../shared/centralaReporter';

async function main() {
    const dataDir = path.join(__dirname, '..', 'data');
    const zipUrl = 'https://c3ntrala.ag3nts.org/dane/pliki_z_fabryki.zip';
    
    // First, download and organize the files
    const processor = new ZipProcessor(dataDir, zipUrl);
    await processor.downloadAndProcess();

    // Then, analyze the reports with facts using GPT-4.1
    const reportProcessor = new ReportProcessor(dataDir);
    setReportProcessor(reportProcessor);
    const result = await reportProcessor.analyzeReportsWithFacts();
    
    // Print the final result
    console.log('\nFinal Analysis Result:');
    console.log(JSON.stringify(result, null, 2));

    // Send the result to Centrala
    console.log('\nSending result to Centrala...');
    await reportJsonToCentrala(result, "dokumenty");
    console.log('Result sent successfully!');
}

main().catch(console.error); 