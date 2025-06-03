import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as cheerio from 'cheerio';

// Load environment variables
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const IMAGES_DIR = path.join(RAW_DIR, 'images');
const AUDIO_DIR = path.join(RAW_DIR, 'audio');

// Create necessary directories
if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

async function downloadFile(url: string, filePath: string): Promise<void> {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });
        fs.writeFileSync(filePath, response.data);
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        throw error;
    }
}

async function downloadHtmlAndResources(): Promise<void> {
    try {
        // Download the main HTML file
        const articleUrl = 'https://arxiv.org/html/2402.12345v1';
        const articlePath = path.join(RAW_DIR, 'article.html');
        console.log('Downloading article...');
        const response = await axios.get(articleUrl);
        const html = response.data;
        fs.writeFileSync(articlePath, html);

        // Parse HTML and find all resources
        const $ = cheerio.load(html);
        const resources = new Set<string>();

        // Find all links and images
        $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                resources.add(href);
            }
        });

        $('img[src]').each((_, element) => {
            const src = $(element).attr('src');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                resources.add(src);
            }
        });

        // Download all resources
        console.log(`Found ${resources.size} resources to download`);
        for (const resource of resources) {
            const resourceUrl = new URL(resource, 'https://arxiv.org').toString();
            const resourcePath = path.join(RAW_DIR, path.basename(resource));
            
            // Create directory if it doesn't exist
            const resourceDir = path.dirname(resourcePath);
            if (!fs.existsSync(resourceDir)) {
                fs.mkdirSync(resourceDir, { recursive: true });
            }

            console.log(`Downloading resource: ${resource}`);
            await downloadFile(resourceUrl, resourcePath);
        }
    } catch (error) {
        console.error('Error downloading HTML and resources:', error);
        throw error;
    }
}

export async function downloadData(): Promise<void> {
    try {
        // Download the article
        const articleUrl = 'https://c3ntrala.ag3nts.org/dane/arxiv-draft.html';
        const articlePath = path.join(RAW_DIR, 'article.html');
        await downloadFile(articleUrl, articlePath);
        
        // Parse the HTML
        const html = fs.readFileSync(articlePath, 'utf-8');
        const $ = cheerio.load(html);
        
        // Download images
        const imagePromises: Promise<void>[] = [];
        $('img').each((_, element) => {
            const src = $(element).attr('src');
            if (src) {
                const imageUrl = new URL(src, articleUrl).toString();
                const imageName = path.basename(src);
                const imagePath = path.join(IMAGES_DIR, imageName);
                imagePromises.push(downloadFile(imageUrl, imagePath));
            }
        });
        
        // Download audio files
        const audioPromises: Promise<void>[] = [];
        $('audio source').each((_, element) => {
            const src = $(element).attr('src');
            if (src) {
                const audioUrl = new URL(src, articleUrl).toString();
                const audioName = path.basename(src);
                const audioPath = path.join(AUDIO_DIR, audioName);
                audioPromises.push(downloadFile(audioUrl, audioPath));
            }
        });
        
        // Wait for all downloads to complete
        await Promise.all([...imagePromises, ...audioPromises]);
        
        console.log('All data downloaded successfully!');
    } catch (error) {
        console.error('Error downloading data:', error);
        throw error;
    }
} 