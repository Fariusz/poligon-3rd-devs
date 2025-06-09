import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export function getPersonalApiKey(): string {
    // Try to load the .env file from the monorepo root
    const envPath = path.resolve(__dirname, '../../../../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/PERSONAL_API_KEY\s*=\s*(.+)/);
        if (match) {
            return match[1].trim();
        }
    }
    throw new Error('PERSONAL_API_KEY not found in .env');
}
