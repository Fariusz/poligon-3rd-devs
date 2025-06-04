import { LLMService } from '../../../shared/LLMService';
import { Model } from '../../../shared/LLMService';
import fs from 'fs';
import path from 'path';

export class SQLGenerator {
    private llmService: LLMService;
    private dataDir: string;

    constructor() {
        this.llmService = new LLMService(
            'You are a SQL expert. Your task is to generate SQL queries based on the provided database schema and requirements. Always return ONLY the raw SQL query without any additional text, markers, or formatting.',
            Model.GPT4o
        );
        this.dataDir = path.join(__dirname, '../data');
    }

    private loadTableSchemas(): string {
        const schemaFiles = fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const content = fs.readFileSync(path.join(this.dataDir, file), 'utf-8');
                return `Table: ${file.replace('.sql', '')}\n${content}`;
            })
            .join('\n\n');

        return schemaFiles;
    }

    private cleanGeneratedQuery(query: string): string {
        // Usuń znaczniki SQL_QUERY_START i SQL_QUERY_END
        query = query.replace(/SQL_QUERY_START\s*/g, '');
        query = query.replace(/\s*SQL_QUERY_END/g, '');
        
        // Usuń znaczniki RELEVANT_TABLES_START i RELEVANT_TABLES_END
        query = query.replace(/RELEVANT_TABLES_START\s*/g, '');
        query = query.replace(/\s*RELEVANT_TABLES_END/g, '');
        
        // Usuń znaczniki SCHEMA_ANALYSIS_START i SCHEMA_ANALYSIS_END
        query = query.replace(/SCHEMA_ANALYSIS_START\s*/g, '');
        query = query.replace(/\s*SCHEMA_ANALYSIS_END/g, '');
        
        // Usuń białe znaki z początku i końca
        query = query.trim();
        
        return query;
    }

    async generateQuery(prompt: string): Promise<string> {
        const schemas = this.loadTableSchemas();
        const fullPrompt = `${prompt}\n\nAvailable table schemas:\n${schemas}`;
        
        const response = await this.llmService.sendMessage(fullPrompt);
        const generatedQuery = this.cleanGeneratedQuery(response);

        // Zapisz wygenerowane zapytanie do pliku
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const queryFile = path.join(this.dataDir, `generated_query_${timestamp}.sql`);
        fs.writeFileSync(queryFile, generatedQuery);

        return generatedQuery;
    }
} 