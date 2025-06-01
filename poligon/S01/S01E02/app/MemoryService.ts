import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import matter from 'gray-matter';
import yaml from 'js-yaml';

export interface Message {
    text: string;
    msgID: string;
}

export interface Memory {
    uuid: string;
    text: string;
    msgID: string;
    timestamp: string;
    keywords: string[];
    isQuestion?: boolean;
    isAnswer?: boolean;
}

export class MemoryService {
    private rootDir: string;
    private memoryIndex: Map<string, Memory>;
    private currentMsgID: string;

    constructor(rootDir: string) {
        this.rootDir = rootDir;
        this.memoryIndex = new Map();
        this.currentMsgID = "0";
        this.initialize();
    }

    private async initialize() {
        await this.ensureDirectories();
        await this.loadMemories();
    }

    private async ensureDirectories() {
        await fs.mkdir(path.join(this.rootDir, 'memories'), { recursive: true });
    }

    private async loadMemories() {
        const memoriesDir = path.join(this.rootDir, 'memories');
        try {
            const files = await fs.readdir(memoriesDir);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const content = await fs.readFile(path.join(memoriesDir, file), 'utf-8');
                    const { data } = matter(content);
                    if (data.uuid) {
                        this.memoryIndex.set(data.uuid, data as Memory);
                    }
                }
            }
        } catch (error) {
            throw new Error('Failed to load memories');
        }
    }

    async saveMemory(message: Message, isQuestion: boolean = false, isAnswer: boolean = false) {
        const memory: Memory = {
            uuid: uuidv4(),
            text: message.text,
            msgID: message.msgID,
            timestamp: new Date().toISOString(),
            keywords: this.extractKeywords(message.text),
            isQuestion,
            isAnswer
        };

        const filePath = path.join(this.rootDir, 'memories', `${memory.uuid}.md`);
        const yamlContent = `---\n${yaml.dump(memory)}---\n${message.text}`;
        
        await fs.writeFile(filePath, yamlContent);
        this.memoryIndex.set(memory.uuid, memory);
        
        return memory;
    }

    private extractKeywords(text: string): string[] {
        const words = text.toLowerCase().split(/\s+/);
        return [...new Set(words.filter(word => word.length > 3))];
    }

    async getMemory(uuid: string): Promise<Memory | null> {
        return this.memoryIndex.get(uuid) || null;
    }

    async getAllMemories(): Promise<Memory[]> {
        return Array.from(this.memoryIndex.values());
    }

    setCurrentMsgID(msgID: string) {
        this.currentMsgID = msgID;
    }

    getCurrentMsgID(): string {
        return this.currentMsgID;
    }
} 