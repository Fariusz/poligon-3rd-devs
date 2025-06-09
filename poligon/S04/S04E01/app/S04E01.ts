import axios from 'axios';
import { getPersonalApiKey } from './env';
import { downloadImages } from './download_images';

// Entry point for the episode

async function main() {
    const apiKey = getPersonalApiKey();
    const response = await axios.post('https://c3ntrala.ag3nts.org/report', {
        task: 'photos',
        apikey: apiKey,
        answer: 'START',
    });
    console.log('Automat response:', response.data);

    await downloadImages();
}

main();