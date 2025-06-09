import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function getImageUrlsFromAutomat(): Promise<string[]> {
    const apiKey = require('./env').getPersonalApiKey();
    const response = await axios.post('https://c3ntrala.ag3nts.org/report', {
        task: 'photos',
        apikey: apiKey,
        answer: 'START',
    });
    const message: string = response.data.message;
    // Extract all URLs ending with .PNG from the message
    const urls = Array.from(message.matchAll(/https?:\/\/\S+?\.PNG/gi)).map(m => m[0]);
    return urls;
}

const dataDir = path.resolve(__dirname, '../data');
console.log('Saving images to:', dataDir);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created directory:', dataDir);
}

export async function downloadImages() {
    const urls = await getImageUrlsFromAutomat();
    for (const url of urls) {
        const filename = path.basename(url);
        const filePath = path.join(dataDir, filename);
        console.log('Downloading:', url, '->', filePath);
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            fs.writeFileSync(filePath, response.data);
            console.log(`Downloaded ${filename}`);
        } catch (err) {
            console.error('Error downloading', url, err);
        }
    }
}

downloadImages().catch(console.error);
