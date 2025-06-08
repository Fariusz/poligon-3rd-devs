import { queryDatabase } from './database';
import path from 'path';
import fs from 'fs';

export interface User {
    id: number;
    name: string;
}

export interface Connection {
    user_id: number;
    connected_user_id: number;
}

export class DataService {
    private dataDir: string;

    constructor() {
        this.dataDir = path.resolve(__dirname, '../data');
    }

    /**
     * Fetches and stores users and connections data from the database
     * @param apiKey API key for database access
     */
    async fetchAndStoreData(apiKey: string): Promise<void> {
        try {
            // First, let's check the table structure
            const usersStructureQuery = 'SHOW CREATE TABLE users';
            const usersStructureResult = await queryDatabase(apiKey, usersStructureQuery);
            
            if (!usersStructureResult.success) {
                throw new Error(`Failed to get users table structure: ${usersStructureResult.error}`);
            }

            console.log('\nUsers table structure:');
            console.log(JSON.stringify(usersStructureResult.data, null, 2));

            const connectionsStructureQuery = 'SHOW CREATE TABLE connections';
            const connectionsStructureResult = await queryDatabase(apiKey, connectionsStructureQuery);
            
            if (!connectionsStructureResult.success) {
                throw new Error(`Failed to get connections table structure: ${connectionsStructureResult.error}`);
            }

            console.log('\nConnections table structure:');
            console.log(JSON.stringify(connectionsStructureResult.data, null, 2));

            // Fetch users data
            const usersQuery = 'SELECT id, username FROM users';
            const usersResult = await queryDatabase(apiKey, usersQuery);
            
            if (!usersResult.success) {
                throw new Error(`Failed to fetch users: ${usersResult.error}`);
            }

            // Fetch connections data
            const connectionsQuery = 'SELECT user1_id, user2_id FROM connections';
            const connectionsResult = await queryDatabase(apiKey, connectionsQuery);
            
            if (!connectionsResult.success) {
                throw new Error(`Failed to fetch connections: ${connectionsResult.error}`);
            }

            // Create data directory if it doesn't exist
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }

            // Save users data
            const usersData = usersResult.data.reply.map((user: any) => ({
                id: user.id,
                name: user.username
            }));
            fs.writeFileSync(
                path.join(this.dataDir, 'users.json'),
                JSON.stringify(usersData, null, 2)
            );

            // Save connections data
            const connectionsData = connectionsResult.data.reply.map((conn: any) => ({
                user_id: conn.user1_id,
                connected_user_id: conn.user2_id
            }));
            fs.writeFileSync(
                path.join(this.dataDir, 'connections.json'),
                JSON.stringify(connectionsData, null, 2)
            );

            console.log('\nData successfully fetched and stored:');
            console.log(`- Users: ${usersData.length} records`);
            console.log(`- Connections: ${connectionsData.length} records`);

        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    /**
     * Loads users data from the local JSON file
     */
    getUsers(): User[] {
        const filePath = path.join(this.dataDir, 'users.json');
        if (!fs.existsSync(filePath)) {
            throw new Error('Users data file not found. Please fetch data first.');
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    /**
     * Loads connections data from the local JSON file
     */
    getConnections(): Connection[] {
        const filePath = path.join(this.dataDir, 'connections.json');
        if (!fs.existsSync(filePath)) {
            throw new Error('Connections data file not found. Please fetch data first.');
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
} 