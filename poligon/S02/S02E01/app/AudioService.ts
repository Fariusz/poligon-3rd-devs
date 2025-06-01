import axios from 'axios';
const AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

class AudioService {
    private readonly AUDIO_URL = 'https://c3ntrala.ag3nts.org/dane/przesluchania.zip';
    private readonly REPORT_URL = 'https://c3ntrala.ag3nts.org/report';

    async downloadAndExtractAudio(): Promise<string> {
        const zipPath = path.join(__dirname, 'przesluchania.zip');
        const extractPath = path.join(__dirname, 'data/audio_files');

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
        const formData = new FormData();
        formData.append('answer', answer);

        try {
            const response = await axios.post(this.REPORT_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            console.log('Answer sent successfully:', response.data);
        } catch (error) {
            console.error('Error sending answer:', error);
        }
    }
}

export default AudioService; 