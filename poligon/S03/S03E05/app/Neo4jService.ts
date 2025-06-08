import neo4j, { Driver, Session } from 'neo4j-driver';
import { User, Connection } from './dataService';
import { LLMService } from '../../../shared/LLMService';
import { Model } from '../../../shared/LLMService';

export interface Neo4jConfig {
    uri: string;
    user: string;
    password: string;
}

export interface PathResult {
    path: string;
    length: number;
}

export class Neo4jService {
    private driver: Driver;
    private llmService: LLMService;

    constructor(config: Neo4jConfig) {
        this.driver = neo4j.driver(
            config.uri,
            neo4j.auth.basic(config.user, config.password)
        );
        this.llmService = new LLMService(
            'You are a Neo4j Cypher query expert. Your task is to generate Cypher queries based on the provided requirements. Always return ONLY the raw Cypher query without any additional text, markers, or formatting.',
            Model.GPT4o
        );
    }

    /**
     * Creates user nodes in Neo4j
     * @param users List of users from MySQL database
     */
    async createUserNodes(users: User[]): Promise<void> {
        const session = this.driver.session();
        try {
            // Clear existing data
            await session.run('MATCH (n) DETACH DELETE n');

            // Create user nodes
            for (const user of users) {
                await session.run(
                    'CREATE (u:User {id: $id, username: $username})',
                    {
                        id: user.id,
                        username: user.name // Using name from our interface which contains username from MySQL
                    }
                );
            }
            console.log(`Created ${users.length} user nodes`);
        } finally {
            await session.close();
        }
    }

    /**
     * Creates relationships between users in Neo4j
     * @param connections List of connections from MySQL database
     */
    async createRelationships(connections: Connection[]): Promise<void> {
        const session = this.driver.session();
        try {
            for (const conn of connections) {
                await session.run(
                    'MATCH (u1:User {id: $user1Id}), (u2:User {id: $user2Id}) ' +
                    'CREATE (u1)-[:KNOWS]->(u2)',
                    {
                        user1Id: conn.user_id,
                        user2Id: conn.connected_user_id
                    }
                );
            }
            console.log(`Created ${connections.length} relationships`);
        } finally {
            await session.close();
        }
    }

    /**
     * Verifies the data in Neo4j
     */
    async verifyData(): Promise<void> {
        const session = this.driver.session();
        try {
            const userCount = await session.run('MATCH (u:User) RETURN count(u) as count');
            const relCount = await session.run('MATCH ()-[r:KNOWS]->() RETURN count(r) as count');

            console.log('\n=== Neo4j Data Verification ===');
            console.log(`User nodes: ${userCount.records[0].get('count').toNumber()}`);
            console.log(`KNOWS relationships: ${relCount.records[0].get('count').toNumber()}`);
        } finally {
            await session.close();
        }
    }

    /**
     * Finds the shortest path between two users
     * @param startUsername Starting user's username
     * @param endUsername Ending user's username
     */
    async findShortestPath(startUsername: string, endUsername: string): Promise<PathResult | null> {
        const session = this.driver.session();
        try {
            const query = `
                MATCH (start:User {username: $startUsername}), (end:User {username: $endUsername})
                WITH start, end, shortestPath((start)-[:KNOWS*]-(end)) AS sp
                RETURN CASE WHEN sp IS NOT NULL THEN
                    {path: [node IN nodes(sp) | node.username], length: length(sp)}
                ELSE
                    null
                END AS result
            `;

            console.log('\nGenerated Cypher query:');
            console.log(query);

            const result = await session.run(query, {
                startUsername,
                endUsername
            });

            const pathData = result.records[0]?.get('result');
            if (!pathData) {
                return null;
            }

            return {
                path: pathData.path.join(','),
                length: pathData.length
            };
        } finally {
            await session.close();
        }
    }

    /**
     * Closes the Neo4j driver connection
     */
    async close(): Promise<void> {
        await this.driver.close();
    }
} 