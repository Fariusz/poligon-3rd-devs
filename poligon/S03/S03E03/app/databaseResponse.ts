import * as fs from 'fs';
import * as path from 'path';

interface TableInfo {
    name: string;
    structure?: string;
}

interface DatabaseResponse {
    reply: any[];
    error: string;
}

export class DatabaseResponseHandler {
    static processShowTablesResponse(response: DatabaseResponse): TableInfo[] {
        if (!response.reply || !Array.isArray(response.reply)) {
            throw new Error('Invalid response format');
        }

        // Extract table names from the response
        const tables = response.reply.map(item => {
            // Handle different possible response formats
            if (item.Tables_in_banan) {
                return { name: item.Tables_in_banan };
            }
            // Add more format handlers if needed
            return { name: String(item) };
        });

        // Remove duplicates
        const uniqueTables = Array.from(new Set(tables.map(t => t.name)))
            .map(name => ({ name }));

        return uniqueTables;
    }

    static processShowCreateTableResponse(response: DatabaseResponse): string {
        if (!response.reply || !Array.isArray(response.reply) || response.reply.length === 0) {
            throw new Error('Invalid response format for table structure');
        }

        // The response should contain a single row with the CREATE TABLE statement
        const createTableRow = response.reply[0];
        if (createTableRow['Create Table']) {
            return createTableRow['Create Table'];
        }

        throw new Error('Unexpected table structure response format');
    }

    static formatTableList(tables: TableInfo[]): string {
        if (tables.length === 0) {
            return 'No tables found in the database.';
        }

        let output = `Found ${tables.length} tables:\n`;
        
        tables.forEach((table, index) => {
            output += `\n${index + 1}. ${table.name}`;
            if (table.structure) {
                output += `\n   Structure:\n   ${table.structure.split('\n').join('\n   ')}`;
            } else {
                output += '\n   Structure: Not available';
            }
        });

        return output;
    }

    static saveTableStructures(tables: TableInfo[]): void {
        const dataDir = path.resolve(__dirname, '../data');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save each table structure to a separate file
        tables.forEach(table => {
            const fileName = `${table.name}.sql`;
            const filePath = path.join(dataDir, fileName);
            
            let content = `-- Structure for table: ${table.name}\n`;
            content += `-- Generated on: ${new Date().toISOString()}\n\n`;
            
            if (table.structure) {
                content += table.structure;
            } else {
                content += '-- Structure not available';
            }

            fs.writeFileSync(filePath, content);
            console.log(`Saved structure for table ${table.name} to ${fileName}`);
        });

        // Save summary file
        const summaryPath = path.join(dataDir, 'database_structure_summary.txt');
        const summary = this.formatTableList(tables);
        fs.writeFileSync(summaryPath, summary);
        console.log(`\nSaved database structure summary to database_structure_summary.txt`);
    }
} 