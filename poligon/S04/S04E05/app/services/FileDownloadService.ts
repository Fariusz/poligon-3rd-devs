import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class FileDownloadService {
    async downloadFile(url: string, outputPath: string): Promise<void> {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer'
            });

            // Ensure the data directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write the file
            fs.writeFileSync(outputPath, response.data);
            console.log(`Successfully downloaded: ${outputPath}`);
        } catch (error) {
            console.error(`Error downloading ${url}:`, error);
            throw error;
        }
    }
} 