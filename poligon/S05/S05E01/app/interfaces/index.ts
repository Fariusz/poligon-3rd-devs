import {
  TaskInfo,
  TaskData,
  Conversation,
  Fact,
  Question,
  CentralaRequest,
} from "../models";

export interface ITaskApiClient {
  getTaskInfo(): Promise<TaskInfo>;
  getTaskToken(): Promise<string>;
  getTaskData(token: string): Promise<TaskData>;
}

export interface ILiarDetector {
  findLiar(conversations: Conversation[], facts: Fact[]): string;
}

export interface ILLMService {
  sendMessage(message: string): Promise<string>;
}

export interface IQuestionHandler {
  handleQuestion(
    question: string,
    conversations: Conversation[],
    facts: Fact[],
    liarPerson: string,
  ): Promise<string>;
}

export interface ICentralaReporter {
  reportToCentrala(request: CentralaRequest): Promise<void>;
}

export interface IConfigProvider {
  getPersonalApiKey(): string;
  getEnvironmentConfig(): Record<string, string>;
}

export interface IPhoneTaskProcessor {
  processTask(): Promise<void>;
}

export interface ILogger {
  log(message: string, ...args: any[]): void;
  error(message: string, error?: Error): void;
  debug(message: string, ...args: any[]): void;
}
