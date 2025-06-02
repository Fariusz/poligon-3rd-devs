import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import extract from 'extract-zip';

export async function downloadFile(): Promise<void> {
    const url = 'https://c3ntrala.ag3nts.org/dane/pliki_z_fabryki.zip';
    const dataDir = path.join(__dirname, '../data');
    const zipPath = path.join(dataDir, 'pliki_z_fabryki.zip');

    try {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        console.log('Downloading file...');
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Download completed successfully!');
                resolve(true);
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
}

function organizeFilesByType(sourceDir: string): void {
    // Create type-specific directories
    const textDir = path.join(sourceDir, 'text');
    const imageDir = path.join(sourceDir, 'images');
    const audioDir = path.join(sourceDir, 'audio');
    const othersDir = path.join(sourceDir, 'others');

    // Create directories if they don't exist
    [textDir, imageDir, audioDir, othersDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Get all files in the source directory
    const files = fs.readdirSync(sourceDir);

    // Move files to appropriate directories based on extension
    files.forEach(file => {
        const sourcePath = path.join(sourceDir, file);
        
        // Skip directories
        if (fs.statSync(sourcePath).isDirectory()) {
            return;
        }

        const ext = path.extname(file).toLowerCase();
        let targetDir: string;

        switch (ext) {
            case '.txt':
                targetDir = textDir;
                break;
            case '.png':
                targetDir = imageDir;
                break;
            case '.mp3':
                targetDir = audioDir;
                break;
            default:
                targetDir = othersDir; // Move other files to 'others' directory
                break;
        }

        const targetPath = path.join(targetDir, file);
        fs.renameSync(sourcePath, targetPath);
    });

    console.log('Files have been organized into type-specific directories.');
}

export async function extractZipFile(): Promise<void> {
    const dataDir = path.join(__dirname, '../data');
    const zipPath = path.join(dataDir, 'pliki_z_fabryki.zip');
    const extractPath = path.join(dataDir, 'pliki_z_fabryki');

    try {
        console.log('Extracting files...');
        await extract(zipPath, { dir: extractPath });
        console.log('Files extracted successfully!');

        // Organize files by type
        organizeFilesByType(extractPath);

        // Delete the ZIP file
        fs.unlinkSync(zipPath);
        console.log('ZIP file deleted successfully!');
    } catch (error) {
        console.error('Error extracting files:', error);
        throw error;
    }
} 