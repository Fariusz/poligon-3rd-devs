import * as dotenv from 'dotenv';
import * as path from 'path';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import { FileService } from './FileService';
import { QuestionProcessor } from './QuestionProcessor';
import { ResponseBuilder } from './ResponseBuilder';
import { ResponseData } from './types';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
    try {
        const fileService = new FileService();
        const questionProcessor = new QuestionProcessor();
        const responseBuilder = new ResponseBuilder(fileService.getApiKey());
        
        // Download and save the file
        const responseData = await fileService.downloadAndSaveFile();
        
        // Process the questions
        await questionProcessor.processSpecialQuestions(responseData["test-data"]);
        questionProcessor.processEquations(responseData["test-data"]);
        
        // Create and save the final response
        const finalResponse = responseBuilder.buildFinalResponse(responseData);
        fileService.saveCorrectedData(finalResponse);

        // Send the corrected data via POST
        console.log('\n=== SENDING CORRECTED DATA ===');
        await reportJsonToCentrala(finalResponse.answer, "JSON");
        
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
