import { reportJsonToCentrala } from '../../../../shared/centralaReporter';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PERSONAL_API_KEY = process.env.PERSONAL_API_KEY;
const AZYL_PORT = process.env.AZYL_PORT || '50005';

if (!PERSONAL_API_KEY) {
    throw new Error('PERSONAL_API_KEY is not defined in .env file');
}

async function sendUrlToCentrala() {
    try {
        const apiUrl = `https://azyl-${AZYL_PORT}.ag3nts.org/drone`;
        
        console.log('\n🚀 Sending API URL to Centrala...');
        console.log('URL:', apiUrl);
        console.log('API Key:', PERSONAL_API_KEY);
        
        await reportJsonToCentrala({
            task: 'webhook',
            apikey: PERSONAL_API_KEY,
            answer: apiUrl
        });
        
        console.log('\n✅ URL sent successfully!');
        console.log('Waiting for Centrala to test the webhook...');
        console.log('This process will hang until Centrala responds with a flag.');
        console.log('DO NOT CLOSE THIS WINDOW!');
    } catch (error) {
        console.error('\n❌ Error sending URL to Centrala:', error);
        throw error;
    }
}

// Uruchom wysyłkę URL
sendUrlToCentrala(); 