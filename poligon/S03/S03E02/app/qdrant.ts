import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the project root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// OpenAI text-embedding-3-large uses 3072 dimensions
// This MUST match the embedding model's output dimension
const VECTOR_SIZE = 3072;
const COLLECTION_NAME = "reports";

// Get Qdrant configuration from environment variables
const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Validate environment variables
const missingVars = [];
if (!QDRANT_URL) missingVars.push('QDRANT_URL');
if (!QDRANT_API_KEY) missingVars.push('QDRANT_API_KEY');

if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    console.error('\nPlease create a .env file in the project root with these variables.');
    process.exit(1);
}

const client = new QdrantClient({ 
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY
});

async function setupQdrant() {
    try {
        // Check if collection exists and delete it if it does
        const collections = await client.getCollections();
        const collectionExists = collections.collections.some(
            (collection) => collection.name === COLLECTION_NAME
        );

        if (collectionExists) {
            console.log(`Deleting existing collection "${COLLECTION_NAME}"...`);
            await client.deleteCollection(COLLECTION_NAME);
            console.log(`Collection "${COLLECTION_NAME}" deleted successfully`);
        }

        // Create new collection
        console.log(`Creating new collection "${COLLECTION_NAME}"...`);
        await client.createCollection(COLLECTION_NAME, {
            vectors: {
                size: VECTOR_SIZE,
                distance: "Cosine"
            },
            // Enable payload indexing for better search performance
            optimizers_config: {
                default_segment_number: 2
            },
            // Configure replication factor for better reliability
            replication_factor: 2
        });
        console.log(`Collection "${COLLECTION_NAME}" created successfully with vector size ${VECTOR_SIZE}`);
    } catch (error) {
        console.error("Error setting up Qdrant:", error);
        throw error;
    }
}

// Helper function to generate a unique ID for points
function generatePointId(): string {
    return crypto.randomUUID();
}

// Export for use in other files
export { 
    client, 
    COLLECTION_NAME, 
    VECTOR_SIZE, 
    setupQdrant,
    generatePointId 
}; 