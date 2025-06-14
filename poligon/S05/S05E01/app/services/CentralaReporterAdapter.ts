import { reportToCentrala } from "../../../../shared/centralaReporter";
import { ICentralaReporter, ILogger } from '../interfaces';
import { CentralaRequest } from '../models';

export class CentralaReporterAdapter implements ICentralaReporter {
  constructor(private readonly logger: ILogger) {}

  async reportToCentrala(request: CentralaRequest): Promise<void> {
    this.validateRequest(request);

    try {
      this.logger.log('Submitting report to Centrala');
      this.logger.debug(`Task: ${request.task}, API Key: ${request.apikey.substring(0, 8)}...`);

      const startTime = Date.now();
      await reportToCentrala(request);
      const duration = Date.now() - startTime;

      this.logger.log(`Report submitted successfully to Centrala in ${duration}ms`);
    } catch (error) {
      const errorMessage = 'Failed to submit report to Centrala';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private validateRequest(request: CentralaRequest): void {
    if (!request) {
      throw new Error('Request is required');
    }

    if (!request.task || typeof request.task !== 'string') {
      throw new Error('Request task is required and must be a string');
    }

    if (!request.apikey || typeof request.apikey !== 'string') {
      throw new Error('Request apikey is required and must be a string');
    }

    if (!request.answer) {
      throw new Error('Request answer is required');
    }

    this.validateAnswer(request.answer);
  }

  private validateAnswer(answer: any): void {
    if (typeof answer !== 'object' || answer === null) {
      throw new Error('Answer must be an object');
    }

    if (!answer.sus || typeof answer.sus !== 'string') {
      throw new Error('Answer must contain a valid sus (suspect) field');
    }

    if (!answer.questions || typeof answer.questions !== 'object') {
      throw new Error('Answer must contain a valid questions object');
    }

    // Validate questions structure
    const questionEntries = Object.entries(answer.questions);
    if (questionEntries.length === 0) {
      throw new Error('Answer must contain at least one question');
    }

    for (const [questionId, questionAnswer] of questionEntries) {
      if (typeof questionId !== 'string' || questionId.trim().length === 0) {
        throw new Error('Question ID must be a non-empty string');
      }

      if (typeof questionAnswer !== 'string' || (questionAnswer as string).trim().length === 0) {
        throw new Error(`Answer for question ${questionId} must be a non-empty string`);
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  // Factory method for creating adapter
  static create(logger: ILogger): CentralaReporterAdapter {
    return new CentralaReporterAdapter(logger);
  }
}
