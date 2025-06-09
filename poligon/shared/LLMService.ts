import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export enum Model {
    GPT4_MINI = 'gpt-4o-mini',
    GPT4o = 'gpt-4o',
    GPT4_1 = 'gpt-4.1',
    DALL_E = 'dall-e-3',
    WHISPER = 'whisper-1',
}

type MessageContent = string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}>;

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: MessageContent;
}

export interface LLMRequest {
    messages: Message[];
    model?: Model;
    temperature?: number;
    maxTokens?: number;
}

export class LLMService {
    private openai: OpenAI;
    private defaultModel: Model;
    private defaultSystemPrompt?: string;

    constructor(systemPrompt?: string, model: Model = Model.GPT4_MINI) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.defaultModel = model;
        this.defaultSystemPrompt = systemPrompt;
    }

    /**
     * Generate embedding for the given text using text-embedding-3-large model
     * @param text The text to generate embedding for
     * @returns The embedding vector
     */
    async getEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-large",
                input: text,
                encoding_format: "float"
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Send content to the language model
     * @param request The request containing messages and optional parameters
     * @returns The model's response
     */
    async send(request: LLMRequest): Promise<string> {
        try {
            const messages: Message[] = [];
            
            // Add system prompt from constructor if it exists
            if (this.defaultSystemPrompt) {
                messages.push({
                    role: 'system',
                    content: this.defaultSystemPrompt
                });
            }

            // Add user messages
            messages.push(...request.messages);

            const completion = await this.openai.chat.completions.create({
                model: request.model || this.defaultModel,
                messages: messages as any, // Type assertion needed due to OpenAI API types
                temperature: request.temperature,
                max_tokens: request.maxTokens
            });

            return completion.choices[0].message.content || 'No answer received';
        } catch (error) {
            console.error('Error getting answer from GPT:', error);
            throw error;
        }
    }

    /**
     * Send a single message to the language model
     * @param message The message to send
     * @param systemPrompt Optional system prompt to guide the model (overrides default)
     * @param model Optional model to use (overrides default)
     * @returns The model's response
     */
    async sendMessage(message: string, systemPrompt?: string, model?: Model): Promise<string> {
        try {
            const messages: Message[] = [];
            
            const finalSystemPrompt = systemPrompt || this.defaultSystemPrompt;
            if (finalSystemPrompt) {
                messages.push({
                    role: 'system',
                    content: finalSystemPrompt
                });
            }

            // Check if message contains base64 image
            if (message.includes('data:image/jpeg;base64,')) {
                const [text, base64Image] = message.split('data:image/jpeg;base64,');
                messages.push({
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: text.trim()
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                });
            } else {
                messages.push({
                    role: 'user',
                    content: message
                });
            }

            const completion = await this.openai.chat.completions.create({
                model: model || this.defaultModel,
                messages: messages as any // Type assertion needed due to OpenAI API types
            });

            return completion.choices[0].message.content || 'No answer received';
        } catch (error) {
            console.error('Error getting answer from GPT:', error);
            throw error;
        }
    }

    /**
     * Send multiple messages in a conversation to the language model
     * @param messages Array of messages in the conversation
     * @param model Optional model to use (overrides default)
     * @returns The model's response
     */
    async sendConversation(messages: Message[], model?: Model): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: model || this.defaultModel,
                messages: messages as any // Type assertion needed due to OpenAI API types
            });

            return completion.choices[0].message.content || 'No answer received';
        } catch (error) {
            console.error('Error getting answer from GPT:', error);
            throw error;
        }
    }

    /**
     * Send a message with a specific system prompt for short answers
     * @param message The message to send
     * @param model Optional model to use (overrides default)
     * @returns The model's response
     */
    async sendShortAnswer(message: string, model?: Model): Promise<string> {
        return this.sendMessage(message, 'Answer the questions with shortest possible answer.', model);
    }
} 