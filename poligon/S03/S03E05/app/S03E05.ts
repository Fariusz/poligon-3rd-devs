// Entry point for the episode

import { DataService } from './dataService';
import { Neo4jService, Neo4jConfig } from './Neo4jService';
import { reportJsonToCentrala } from '../../../shared/centralaReporter';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const API_KEY = process.env.PERSONAL_API_KEY;
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!API_KEY) {
    console.error('Error: PERSONAL_API_KEY is not defined in .env file');
    process.exit(1);
}

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    console.error('Error: Neo4j credentials are not defined in .env file');
    process.exit(1);
}

async function main() {
    const dataService = new DataService();
    let neo4jService: Neo4jService | null = null;

    try {
        // Fetch and store data from MySQL
        await dataService.fetchAndStoreData(API_KEY as string);

        // Load data into Neo4j
        const users = dataService.getUsers();
        const connections = dataService.getConnections();

        // Create nodes and relationships in Neo4j
        const neo4jConfig: Neo4jConfig = {
            uri: NEO4J_URI as string,
            user: NEO4J_USER as string,
            password: NEO4J_PASSWORD as string
        };
        neo4jService = new Neo4jService(neo4jConfig);
        await neo4jService.createUserNodes(users);
        await neo4jService.createRelationships(connections);

        // Verify the data in Neo4j
        await neo4jService.verifyData();

        // Find shortest path between Rafał and Barbara
        console.log('\n=== Finding Shortest Path ===');
        const pathResult = await neo4jService.findShortestPath('Rafał', 'Barbara');
        
        if (pathResult) {
            console.log('\nShortest path found:');
            console.log(pathResult.path);

            // Send result to centrala
            console.log('\nSending result to centrala...');
            await reportJsonToCentrala({
                task: 'connections',
                apikey: API_KEY,
                answer: pathResult.path
            });
            console.log('Result sent successfully');
        } else {
            console.log('\nNo path found between Rafał and Barbara');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (neo4jService) {
            await neo4jService.close();
        }
    }
}

// Execute the main function
main().catch(console.error); 