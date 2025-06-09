// Entry point for the episode

import { downloadAndExtractData } from './downloadData';

async function main() {
    try {
        await downloadAndExtractData();
        console.log('Data download and extraction completed successfully');
    } catch (error) {
        console.error('Failed to download and extract data:', error);
        process.exit(1);
    }
}

main(); 