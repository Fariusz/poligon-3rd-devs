import axios, { AxiosInstance } from 'axios';
import { ITaskApiClient, IConfigProvider, ILogger } from '../interfaces';
import { TaskInfo, TaskData, TaskToken } from '../models';

export class TaskApiClient implements ITaskApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://zadania.aidevs.pl';

  constructor(
    private readonly configProvider: IConfigProvider,
    private readonly logger: ILogger
  ) {
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  async getTaskInfo(): Promise<TaskInfo> {
    try {
      this.logger.log('Fetching task info...');
      const apiKey = this.configProvider.getPersonalApiKey();
      const response = await this.httpClient.get(`/${apiKey}`);

      this.logger.log('Task info retrieved successfully');
      return response.data;
    } catch (error) {
      const errorMessage = 'Failed to get task info';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  async getTaskToken(): Promise<string> {
    try {
      this.logger.log('Requesting task token...');
      const apiKey = this.configProvider.getPersonalApiKey();

      // First check available tasks
      await this.getTaskInfo();

      const response = await this.httpClient.post<TaskToken>(`/token/phone/${apiKey}`);

      if (!response.data.token) {
        throw new Error('No token received from API');
      }

      this.logger.log('Task token retrieved successfully');
      return response.data.token;
    } catch (error) {
      const errorMessage = 'Failed to get task token';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  async getTaskData(token: string): Promise<TaskData> {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      this.logger.log(`Fetching task data with token: ${token}`);
      const response = await this.httpClient.get<TaskData>(`/task/${token}`);

      this.validateTaskData(response.data);

      this.logger.log('Task data retrieved successfully');
      return response.data;
    } catch (error) {
      const errorMessage = 'Failed to get task data';
      this.logger.error(errorMessage, error as Error);
      throw new Error(`${errorMessage}: ${this.getErrorMessage(error)}`);
    }
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.log(`Response received: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        if (error.response) {
          this.logger.error(
            `HTTP Error: ${error.response.status} ${error.response.statusText}`,
            error
          );
        } else if (error.request) {
          this.logger.error('Network Error: No response received', error);
        } else {
          this.logger.error('Request Setup Error', error);
        }
        return Promise.reject(error);
      }
    );
  }

  private validateTaskData(data: any): void {
    if (!data) {
      throw new Error('Task data is empty');
    }

    if (!Array.isArray(data.conversations)) {
      throw new Error('Invalid task data: conversations must be an array');
    }

    if (!Array.isArray(data.facts)) {
      throw new Error('Invalid task data: facts must be an array');
    }

    if (!Array.isArray(data.questions)) {
      throw new Error('Invalid task data: questions must be an array');
    }
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error occurred';
  }
}
