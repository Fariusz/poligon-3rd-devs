import dotenv from 'dotenv';
import path from 'path';
import { SecurityService } from './SecurityService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
    try {
        const securityService = new SecurityService();
        const url = 'https://xyz.ag3nts.org/';
        const flag = await securityService.loginAndGetFlag(url, 'tester', '574e112a');
        console.log("Flag: " + flag);
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Unknown error occurred");
        }
    }
}

// Run the function
main();