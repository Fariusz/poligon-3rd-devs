// Entry point for the episode

import { setupQdrant } from './qdrant';
import { ReportProcessor } from './reportProcessor';
import { SearchService } from './searchService';
import { reportJsonToCentrala } from '@shared/centralaReporter';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
    try {
        // Setup Qdrant collection
        console.log('Setting up Qdrant...');
        await setupQdrant();
        console.log('Qdrant setup completed successfully');

        // Process and index reports from the input directory
        console.log('\nStarting report processing...');
        const dataDir = path.join(__dirname, '..', 'data', 'input');
        const reportProcessor = new ReportProcessor(dataDir);
        await reportProcessor.processReports();
        console.log('Report processing completed successfully');

        // Search for the report about weapon prototype theft
        console.log('\nSearching for report about weapon prototype theft...');
        const searchService = new SearchService();
        const query = "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";
        const result = await searchService.search(query);

        if (result) {
            console.log('\nFound matching report:');
            console.log(`Date: ${result.date}`);
            console.log(`Content: ${result.content}`);
            console.log(`Relevance score: ${result.score}`);

            // Send the report date to the central server
            console.log('\nSending report date to central server...');
            await reportJsonToCentrala({
                task: "wektory",
                apikey: process.env.PERSONAL_API_KEY,
                answer: result.date
            });
        } else {
            console.log('No matching report found');
        }
    } catch (error) {
        console.error('Error in main:', error);
    }
}

main(); 