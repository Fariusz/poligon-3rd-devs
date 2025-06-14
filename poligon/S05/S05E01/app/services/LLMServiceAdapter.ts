import { LLMService, Model } from "../../../../shared/LLMService";
import { ILLMService, ILogger } from '../interfaces';

export class LLMServiceAdapter implements ILLMService {
  private readonly llmService: LLMService;

  constructor(
    private readonly logger: ILogger,
    model: Model = Model.GPT4_MINI,
    apiKey?: string
  ) {
    this.llmService = new LLMService(apiKey, model);
  }

  async sendMessage(message: string): Promise<string> {
    this.validateMessage(message);

    try {
      this.logger.log('Sending message to LLM service');
      this.logger.debug(`Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

      const startTime = Date.now();
      const response = await this.llmService.sendMessage(message);
      const duration = Date.now() - startTime;

      this.logger.log(`LLM response received in ${duration}ms`);
      this.logger.debug(`Response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);

      return response;
    } catch (error) {
      const errorMessage = 'Failed to get response from LLM service';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private validateMessage(message: string): void {
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    if (message.trim().length === 0) {
      throw new Error('Message cannot be empty or contain only whitespace');
    }

    // Optional: Add length validation
    const maxLength = 100000; // Adjust based on your needs
    if (message.length > maxLength) {
      throw new Error(`Message too long: ${message.length} characters (max: ${maxLength})`);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // Factory method for creating adapter with default settings
  static createDefault(logger: ILogger, apiKey?: string): LLMServiceAdapter {
    return new LLMServiceAdapter(logger, Model.GPT4_MINI, apiKey);
  }

  // Factory method for creating adapter with specific model
  static createWithModel(logger: ILogger, model: Model, apiKey?: string): LLMServiceAdapter {
    return new LLMServiceAdapter(logger, model, apiKey);
  }
}
