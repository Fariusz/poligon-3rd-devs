import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const TEXT_DIR = path.join(PROCESSED_DIR, 'text');

// Create necessary directories
[PROCESSED_DIR, TEXT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

export async function processHtmlToText(): Promise<void> {
    try {
        // Read HTML file
        const articlePath = path.join(RAW_DIR, 'article.html');
        const html = fs.readFileSync(articlePath, 'utf-8');
        
        // Convert HTML to Markdown
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(html);
        
        // Save processed text
        const outputPath = path.join(TEXT_DIR, 'article.md');
        fs.writeFileSync(outputPath, markdown);
        
        console.log('Text processing completed successfully!');
    } catch (error) {
        console.error('Error processing text:', error);
        throw error;
    }
} 