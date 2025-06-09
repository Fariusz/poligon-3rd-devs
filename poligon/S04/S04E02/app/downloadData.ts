import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
const AdmZip = require('adm-zip');

export async function downloadAndExtractData(): Promise<void> {
    const url = 'https://c3ntrala.ag3nts.org/dane/lab_data.zip';
    const dataDir = path.join(__dirname, '..', 'data');
    const zipPath = path.join(dataDir, 'lab_data.zip');

    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Download the file
        console.log('Downloading data...');
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });

        // Save the zip file
        fs.writeFileSync(zipPath, response.data);
        console.log('File downloaded successfully');

        // Extract the zip file
        console.log('Extracting files...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(dataDir, true);
        console.log('Files extracted successfully');

        // Clean up - remove the zip file
        fs.unlinkSync(zipPath);
        console.log('Cleanup completed');
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 