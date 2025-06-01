import axios from 'axios';
const AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';

class FileService {
    private readonly AUDIO_URL = 'https://c3ntrala.ag3nts.org/dane/przesluchania.zip';

    async downloadAndExtractAudio(): Promise<string> {
        const zipPath = path.join(__dirname, 'przesluchania.zip');
        const extractPath = path.join(__dirname, 'audio_files');

        // Download the ZIP file
        const response = await axios({
            method: 'GET',
            url: this.AUDIO_URL,
            responseType: 'arraybuffer'
        });

        // Save the ZIP file
        fs.writeFileSync(zipPath, response.data);

        // Extract the ZIP file
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        // Clean up the ZIP file
        fs.unlinkSync(zipPath);

        return extractPath;
    }

    async sendAnswer(answer: string): Promise<void> {
        try {
            await reportJsonToCentrala(answer, "mp3");
            console.log('Answer sent successfully');
        } catch (error) {
            console.error('Error sending answer:', error);
        }
    }
}

export default FileService; 