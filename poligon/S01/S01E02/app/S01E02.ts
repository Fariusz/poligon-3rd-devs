import path from 'path';
import * as dotenv from 'dotenv';
import { MemoryService } from './MemoryService';
import { AuthenticationService } from './AuthenticationService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
    try {
        const memoryService = new MemoryService(path.join(__dirname, 'data'));
        const authService = new AuthenticationService(memoryService);
        const result = await authService.handleAuthentication();
        console.log("Result:", result);
    } catch (error) {
        console.error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
}

// Run the function
main(); 