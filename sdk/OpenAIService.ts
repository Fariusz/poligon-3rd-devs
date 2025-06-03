import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { toFile } from "openai";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(messages: ChatCompletionMessageParam[], model: string = "gpt-4o") {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
      });
      return chatCompletion;
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    try {
      const file = await toFile(audioBuffer, 'speech.mp3');
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "pl", // Assuming Polish language
        response_format: "text"
      });
      return response;
    } catch (error) {
      console.error("Error in OpenAI transcription:", error);
      throw error;
    }
  }
}