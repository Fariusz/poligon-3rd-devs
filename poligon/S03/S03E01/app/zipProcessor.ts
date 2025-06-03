import axios from 'axios';
import AdmZip from 'adm-zip';
import * as fs from 'fs-extra';
import * as path from 'path';

export class ZipProcessor {
    private readonly dataDir: string;
    private readonly zipUrl: string;
    private readonly organizedDir: string;

    constructor(dataDir: string, zipUrl: string) {
        this.dataDir = dataDir;
        this.zipUrl = zipUrl;
        this.organizedDir = path.join(dataDir, 'organized');
    }

    async downloadAndProcess(): Promise<void> {
        try {
            // Create data directory if it doesn't exist
            await fs.ensureDir(this.dataDir);
            await fs.ensureDir(this.organizedDir);

            // Download the ZIP file
            console.log('Downloading ZIP file...');
            const response = await axios({
                method: 'GET',
                url: this.zipUrl,
                responseType: 'arraybuffer'
            });

            // Save the ZIP file
            const zipPath = path.join(this.dataDir, 'pliki_z_fabryki.zip');
            await fs.writeFile(zipPath, response.data);
            console.log('ZIP file downloaded successfully');

            // Process the ZIP file
            console.log('Processing ZIP file...');
            const zip = new AdmZip(zipPath);
            const zipEntries = zip.getEntries();

            // Process each entry in the ZIP
            for (const entry of zipEntries) {
                if (!entry.isDirectory) {
                    const entryPath = entry.entryName;
                    const fileName = path.basename(entryPath);
                    const parentDir = path.dirname(entryPath);
                    const parentDirName = path.basename(parentDir).toLowerCase();

                    // Get the file content
                    const content = entry.getData().toString('utf-8');

                    // Determine target directory based on file type and parent directory
                    let targetDir: string;
                    const extension = path.extname(fileName).toLowerCase();

                    if (extension === '.txt') {
                        if (parentDirName === 'facts' || parentDirName === 'fakty') {
                            targetDir = path.join(this.organizedDir, 'txt', 'facts');
                        } else {
                            targetDir = path.join(this.organizedDir, 'txt', 'reports');
                        }
                    } else {
                        targetDir = path.join(this.organizedDir, extension.slice(1));
                    }

                    // Create target directory and save the file
                    await fs.ensureDir(targetDir);
                    const targetPath = path.join(targetDir, fileName);
                    await fs.writeFile(targetPath, content);

                    // Log the processing of text files
                    if (extension === '.txt') {
                        console.log(`\nProcessing file: ${fileName} (${parentDirName})`);
                        console.log('Content:', content);
                    }
                }
            }

            console.log('All files processed and organized successfully');

        } catch (error) {
            console.error('An error occurred:', error);
            throw error;
        }
    }
} 