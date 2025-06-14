import {
  IPhoneTaskProcessor,
  ITaskApiClient,
  ILiarDetector,
  IQuestionHandler,
  ICentralaReporter,
  ILogger,
  IConfigProvider
} from '../interfaces';
import { TaskData, Question, AnswerSubmission } from '../models';

export class PhoneTaskProcessor implements IPhoneTaskProcessor {
  constructor(
    private readonly taskApiClient: ITaskApiClient,
    private readonly liarDetector: ILiarDetector,
    private readonly questionHandler: IQuestionHandler,
    private readonly centralaReporter: ICentralaReporter,
    private readonly configProvider: IConfigProvider,
    private readonly logger: ILogger
  ) {}

  async processTask(): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log('Starting phone task processing...');

      // Step 1: Initialize and get task token
      const token = await this.initializeTask();

      // Step 2: Get task data
      const taskData = await this.getTaskData(token);

      // Step 3: Find the liar
      const liarPerson = await this.identifyLiar(taskData);

      // Step 4: Process all questions
      const answers = await this.processQuestions(taskData, liarPerson);

      // Step 5: Submit results
      await this.submitResults(liarPerson, answers);

      const duration = Date.now() - startTime;
      this.logger.log(`Phone task completed successfully in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Phone task failed after ${duration}ms`, error as Error);
      throw error;
    }
  }

  private async initializeTask(): Promise<string> {
    try {
      this.logger.log('Initializing task...');

      // First, check available tasks
      await this.taskApiClient.getTaskInfo();

      // Then get the token
      const token = await this.taskApiClient.getTaskToken();

      if (!token) {
        throw new Error('Failed to obtain task token');
      }

      this.logger.log(`Task initialized successfully with token: ${token}`);
      return token;

    } catch (error) {
      const errorMessage = 'Failed to initialize task';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private async getTaskData(token: string): Promise<TaskData> {
    try {
      this.logger.log('Retrieving task data...');

      const taskData = await this.taskApiClient.getTaskData(token);

      this.validateTaskData(taskData);

      this.logger.log(
        `Task data retrieved successfully: ${taskData.conversations.length} conversations, ` +
        `${taskData.facts.length} facts, ${taskData.questions.length} questions`
      );

      return taskData;

    } catch (error) {
      const errorMessage = 'Failed to retrieve task data';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private async identifyLiar(taskData: TaskData): Promise<string> {
    try {
      this.logger.log('Starting liar identification...');

      const liarPerson = this.liarDetector.findLiar(taskData.conversations, taskData.facts);

      if (!liarPerson) {
        throw new Error('Failed to identify liar');
      }

      this.logger.log(`Liar identified: ${liarPerson}`);
      return liarPerson;

    } catch (error) {
      const errorMessage = 'Failed to identify liar';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private async processQuestions(taskData: TaskData, liarPerson: string): Promise<Record<string, string>> {
    try {
      this.logger.log(`Processing ${taskData.questions.length} questions...`);

      const answers: Record<string, string> = {};
      const processedQuestions: string[] = [];

      for (const question of taskData.questions) {
        try {
          const questionStartTime = Date.now();

          this.logger.log(`Processing question ${question.id}: "${question.question}"`);

          const answer = await this.questionHandler.handleQuestion(
            question.question,
            taskData.conversations,
            taskData.facts,
            liarPerson
          );

          answers[question.id] = answer;
          processedQuestions.push(question.id);

          const questionDuration = Date.now() - questionStartTime;
          this.logger.log(
            `Question ${question.id} processed successfully in ${questionDuration}ms. Answer: "${answer}"`
          );

        } catch (error) {
          const errorMessage = `Failed to process question ${question.id}`;
          this.logger.error(errorMessage, error as Error);
          throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
        }
      }

      this.logger.log(`All questions processed successfully. Processed: ${processedQuestions.join(', ')}`);
      return answers;

    } catch (error) {
      const errorMessage = 'Failed to process questions';
      this.logger.error(errorMessage, error as Error);
      throw error;
    }
  }

  private async submitResults(liarPerson: string, answers: Record<string, string>): Promise<void> {
    try {
      this.logger.log('Submitting results to Centrala...');

      const submission: AnswerSubmission = {
        sus: liarPerson,
        questions: answers
      };

      this.validateSubmission(submission);

      await this.centralaReporter.reportToCentrala({
        task: 'phone',
        apikey: this.configProvider.getPersonalApiKey(),
        answer: submission
      });

      this.logger.log('Results submitted successfully to Centrala');

    } catch (error) {
      const errorMessage = 'Failed to submit results';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private validateTaskData(taskData: TaskData): void {
    if (!taskData) {
      throw new Error('Task data is null or undefined');
    }

    if (!Array.isArray(taskData.conversations) || taskData.conversations.length === 0) {
      throw new Error('Task data must contain a non-empty conversations array');
    }

    if (!Array.isArray(taskData.facts) || taskData.facts.length === 0) {
      throw new Error('Task data must contain a non-empty facts array');
    }

    if (!Array.isArray(taskData.questions) || taskData.questions.length === 0) {
      throw new Error('Task data must contain a non-empty questions array');
    }

    // Validate question structure
    taskData.questions.forEach((question, index) => {
      if (!question.id || typeof question.id !== 'string') {
        throw new Error(`Invalid question at index ${index}: id is required and must be a string`);
      }

      if (!question.question || typeof question.question !== 'string') {
        throw new Error(`Invalid question at index ${index}: question is required and must be a string`);
      }
    });
  }

  private validateSubmission(submission: AnswerSubmission): void {
    if (!submission.sus || typeof submission.sus !== 'string') {
      throw new Error('Submission must contain a valid sus (suspect) field');
    }

    if (!submission.questions || typeof submission.questions !== 'object') {
      throw new Error('Submission must contain a valid questions object');
    }

    const questionIds = Object.keys(submission.questions);
    if (questionIds.length === 0) {
      throw new Error('Submission must contain at least one question answer');
    }

    // Validate all answers are strings
    for (const [questionId, answer] of Object.entries(submission.questions)) {
      if (typeof answer !== 'string' || answer.trim().length === 0) {
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

  // Method to get processing statistics
  async getProcessingStats(): Promise<{
    totalConversations: number;
    totalFacts: number;
    totalQuestions: number;
    identifiedLiar: string | null;
  }> {
    try {
      const token = await this.taskApiClient.getTaskToken();
      const taskData = await this.taskApiClient.getTaskData(token);
      const liar = this.liarDetector.findLiar(taskData.conversations, taskData.facts);

      return {
        totalConversations: taskData.conversations.length,
        totalFacts: taskData.facts.length,
        totalQuestions: taskData.questions.length,
        identifiedLiar: liar
      };
    } catch (error) {
      this.logger.error('Failed to get processing stats', error as Error);
      return {
        totalConversations: 0,
        totalFacts: 0,
        totalQuestions: 0,
        identifiedLiar: null
      };
    }
  }
}
