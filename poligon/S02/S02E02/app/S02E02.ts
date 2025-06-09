import * as dotenv from 'dotenv';
import * as path from 'path';
import { MapAnalyzer } from './MapAnalyzer';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main(): Promise<void> {
    try {
        console.log('Starting S02E02 - Map Fragment Analysis...');
        
        // Check if required environment variables are present
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not defined in .env file');
        }
        
        if (!process.env.PERSONAL_API_KEY) {
            throw new Error('PERSONAL_API_KEY is not defined in .env file');
        }
        
        const analyzer = new MapAnalyzer();
        await analyzer.run();
        
        console.log('Task completed successfully!');
        
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}

// Run the main function
main();