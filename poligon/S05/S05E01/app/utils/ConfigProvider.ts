import * as dotenv from 'dotenv';
import * as path from 'path';
import { IConfigProvider } from '../interfaces';

export class ConfigProvider implements IConfigProvider {
  private readonly config: Record<string, string>;
  private readonly requiredKeys = ['PERSONAL_API_KEY'];

  constructor(envPath?: string) {
    this.loadEnvironmentVariables(envPath);
    this.config = this.loadConfiguration();
    this.validateRequiredConfiguration();
  }

  getPersonalApiKey(): string {
    const apiKey = this.config.PERSONAL_API_KEY;
    if (!apiKey) {
      throw new Error('PERSONAL_API_KEY is not configured');
    }
    return apiKey;
  }

  getEnvironmentConfig(): Record<string, string> {
    return { ...this.config };
  }

  private loadEnvironmentVariables(envPath?: string): void {
    const resolvedPath = envPath || this.getDefaultEnvPath();

    const result = dotenv.config({ path: resolvedPath });

    if (result.error) {
      console.warn(`Warning: Could not load .env file from ${resolvedPath}:`, result.error.message);
      console.warn('Falling back to system environment variables');
    }
  }

  private getDefaultEnvPath(): string {
    return path.resolve(__dirname, '../../../../../.env');
  }

  private loadConfiguration(): Record<string, string> {
    const config: Record<string, string> = {};

    // Load all environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        config[key] = value;
      }
    }

    return config;
  }

  private validateRequiredConfiguration(): void {
    const missingKeys = this.requiredKeys.filter(key => !this.config[key]);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}\n` +
        'Please ensure these variables are set in your .env file or environment.'
      );
    }
  }

  // Additional utility methods for configuration management
  getString(key: string, defaultValue?: string): string {
    const value = this.config[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key '${key}' is not set`);
    }
    return value;
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.config[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key '${key}' is not set`);
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new Error(`Configuration key '${key}' is not a valid number: ${value}`);
    }
    return numValue;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.config[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key '${key}' is not set`);
    }

    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === '1') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === '0') {
      return false;
    }

    throw new Error(`Configuration key '${key}' is not a valid boolean: ${value}`);
  }

  has(key: string): boolean {
    return key in this.config;
  }

  getOptional(key: string): string | undefined {
    return this.config[key];
  }
}
