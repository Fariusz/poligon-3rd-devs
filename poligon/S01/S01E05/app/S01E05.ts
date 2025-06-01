import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import { CensorService } from './CensorService';
import { FileService } from './FileService';

async function main() {
    try {
        const fileService = new FileService();
        const censorService = new CensorService();
        
        // Download the file
        const originalText = await fileService.downloadFile();
        
        // Print original text
        console.log('\n=== Oryginalny tekst ===');
        console.log(originalText);
        
        // Censor personal data
        const censoredContent = await censorService.censorText(originalText);
        
        // Print censored text
        console.log('\n=== Ocenzurowany tekst ===');
        console.log(censoredContent);
        
        // Save the censored content
        fileService.saveCensoredContent(censoredContent);

        // Send censored data to Centrala
        await reportJsonToCentrala(censoredContent);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
