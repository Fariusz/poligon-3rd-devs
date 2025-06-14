# Phone Task Processor - S05E01

A refactored TypeScript application that processes phone conversation tasks using AI/LLM services. This application identifies liars in conversations based on provided facts and answers questions about the conversations.

## 🏗️ Architecture Overview

This codebase has been completely refactored following SOLID principles and clean architecture patterns:

### SOLID Principles Applied

- **Single Responsibility Principle (SRP)**: Each class has one reason to change
  - `TaskApiClient` - Only handles API communication
  - `LiarDetectionService` - Only handles liar detection logic
  - `QuestionHandlingService` - Only handles question processing
  - `PhoneTaskProcessor` - Only orchestrates the workflow

- **Open/Closed Principle (OCP)**: Classes are open for extension, closed for modification
  - All services implement interfaces, allowing easy extension
  - New detection algorithms can be added without modifying existing code

- **Liskov Substitution Principle (LSP)**: Objects are replaceable with their subtypes
  - All implementations can be substituted via their interfaces
  - Mock implementations can easily replace real ones for testing

- **Interface Segregation Principle (ISP)**: Clients depend only on interfaces they use
  - Small, focused interfaces (e.g., `ILogger`, `IConfigProvider`)
  - No client is forced to depend on unused methods

- **Dependency Inversion Principle (DIP)**: Depend on abstractions, not concretions
  - All dependencies are injected through interfaces
  - High-level modules don't depend on low-level modules

## 📁 Project Structure

```
src/
├── clients/           # External API clients
│   └── TaskApiClient.ts         # Handles zadania.aidevs.pl API
├── interfaces/        # Interface definitions
│   └── index.ts                 # All interface definitions
├── models/           # Data models and types
│   └── index.ts                 # Domain models
├── services/         # Business logic services
│   ├── CentralaReporterAdapter.ts    # Centrala reporting adapter
│   ├── LiarDetectionService.ts       # Liar detection logic
│   ├── LLMServiceAdapter.ts          # LLM service wrapper
│   ├── PhoneTaskProcessor.ts         # Main orchestrator
│   └── QuestionHandlingService.ts    # Question processing
├── utils/            # Utility classes
│   ├── ConfigProvider.ts             # Environment configuration
│   └── Logger.ts                     # Logging utility
└── main.ts           # Application entry point with DI container
```

## 🚀 Key Improvements

### Before (Original Code)
- ❌ Single 200+ line file with multiple responsibilities
- ❌ Hard-coded dependencies
- ❌ No error handling abstractions
- ❌ Difficult to test
- ❌ No separation of concerns
- ❌ Mixed business logic with infrastructure code

### After (Refactored Code)
- ✅ Clean separation of concerns across multiple focused classes
- ✅ Dependency injection with interfaces
- ✅ Comprehensive error handling and logging
- ✅ Easily testable with mock implementations
- ✅ Configuration management
- ✅ Graceful shutdown handling
- ✅ Performance monitoring
- ✅ Structured logging with different levels

## 🔧 Configuration

The application uses environment variables for configuration:

### Required Environment Variables
- `PERSONAL_API_KEY` - Your API key for zadania.aidevs.pl

### Optional Environment Variables
- `NODE_ENV` - Environment (development, production, test)
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARN, ERROR, NONE)

### Environment File
Create a `.env` file in the project root:
```env
PERSONAL_API_KEY=your_api_key_here
NODE_ENV=development
LOG_LEVEL=INFO
```

## 📦 Installation

```bash
# Install dependencies
npm install

# Run the application
npm start
```

## 🏃‍♂️ Running the Application

```bash
# Start with default configuration
npm start

# Run with debug logging
LOG_LEVEL=DEBUG npm start

# Run in production mode
NODE_ENV=production npm start
```

## 🧪 Features

### Comprehensive Logging
- Structured logging with timestamps and log levels
- Performance monitoring for operations
- Error tracking with stack traces
- Configurable log levels

### Error Handling
- Graceful error handling throughout the application
- Detailed error messages with context
- Proper error propagation and reporting

### Configuration Management
- Environment-based configuration
- Validation of required configuration
- Support for different environments (dev, prod, test)

### Dependency Injection
- Clean dependency injection container
- Interface-based dependencies for easy testing
- Proper lifecycle management

## 🔍 How It Works

1. **Initialization**: The application initializes all services through the dependency container
2. **Task Retrieval**: Fetches task information and data from the API
3. **Liar Detection**: Analyzes conversations against facts to identify inconsistencies
4. **Question Processing**: Uses LLM service to answer questions based on context
5. **Result Submission**: Submits findings to the Centrala reporting system

## 🛠️ Development

### Adding New Services
1. Create an interface in `src/interfaces/index.ts`
2. Implement the service in the appropriate directory
3. Register it in the dependency container in `src/main.ts`

### Testing
The modular architecture makes unit testing straightforward:
- Mock any interface for isolated testing
- Test business logic separately from infrastructure
- Use the silent logger for test environments

### Extending Functionality
- Add new detection algorithms by implementing `ILiarDetector`
- Add new question handlers by implementing `IQuestionHandler`
- Add new reporting mechanisms by implementing `ICentralaReporter`

## 📋 Dependencies

### Runtime Dependencies
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- `openai` - OpenAI API client (via LLMService)

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `@types/node` - Node.js type definitions

## 🔄 Migration from Original Code

The refactored code maintains the same functionality as the original but with improved:
- **Maintainability**: Each component has a single responsibility
- **Testability**: All dependencies are injected and can be mocked
- **Reliability**: Comprehensive error handling and logging
- **Extensibility**: Easy to add new features without breaking existing code
- **Readability**: Clear separation of concerns and well-documented interfaces

## 📝 License

This project is part of the AI Devs course materials.