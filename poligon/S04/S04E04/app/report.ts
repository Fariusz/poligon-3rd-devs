import { reportJsonToCentrala } from '../../../../shared/centralaReporter';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;
const AZYL_PORT = process.env.AZYL_PORT || '50005'; // Twój port na Azylu

if (!PERSONAL_API_KEY) {
    throw new Error('PERSONAL_API_KEY is not defined in .env file');
}

async function reportApiUrl() {
    try {
        const apiUrl = `https://azyl-${AZYL_PORT}.ag3nts.org/drone`;
        
        console.log('Reporting API URL to Centrala:', apiUrl);
        
        await reportJsonToCentrala({
            task: 'webhook',
            apikey: PERSONAL_API_KEY,
            answer: apiUrl
        });
        
        console.log('Successfully reported API URL to Centrala');
    } catch (error) {
        console.error('Error reporting API URL to Centrala:', error);
        throw error;
    }
}

// Uruchom zgłoszenie
reportApiUrl(); 