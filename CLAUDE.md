# CLAUDE.md - SQS Admin Project Guide

This document provides comprehensive information needed for working on the SQS Admin project.

## Project Overview

SQS Admin is a web-based administration tool for Amazon Simple Queue Service (SQS), built with Next.js. It allows users to view, create, and manage SQS queues through a user-friendly interface.

**Key Features:**
- View SQS queues and their statistics
- Create Standard and FIFO queues with custom configurations
- Send and view JSON/text messages
- Delete messages and queues
- Auto-refresh message view
- Dark mode support

## Project Structure

```
/app
  /api                 # API routes for SQS operations
    /queues            # Queue-related API endpoints
      /[queueUrl]      # Queue-specific operations
        /messages      # Message-related operations
      /create          # Queue creation endpoint
      /delete          # Queue deletion endpoint
  /components          # React components
    Header.tsx         # Navigation header
    Footer.tsx         # Footer with attribution
    QueueList.tsx      # List of queues component
    QueueDetail.tsx    # Queue details and message viewer
    CreateQueueModal.tsx  # Modal for creating queues
    DeleteQueueModal.tsx  # Modal for queue deletion
  /lib
    sqs.ts             # SQS client and utility functions
  /queues
    /[queueUrl]        # Queue details page
  layout.tsx           # Root layout with header/footer
  page.tsx             # Homepage with queue list
```

## Key Technologies

- **Next.js**: React framework with server-side rendering
- **Tailwind CSS**: For styling and dark mode support
- **AWS SDK for JavaScript v3**: For SQS operations
- **Ace Editor**: For JSON message editing and viewing
- **Docker/Docker Compose**: For containerization and local development

## Configuration

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region to connect to | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `test` for development |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `test` for development |
| `SQS_ENDPOINT` | Custom SQS endpoint URL | `http://localhost:4566` for LocalStack |
| `PORT` | Server port for the application | `8086` |

## Development Setup

### Prerequisites

- Node.js v18+
- Docker and Docker Compose (optional, for local development)

### Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with configuration (optional):
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_or_test
   AWS_SECRET_ACCESS_KEY=your_secret_key_or_test
   SQS_ENDPOINT=http://localhost:4566  # For LocalStack
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:8086 in your browser

### Using Docker

Docker is configured to run on port 8086:

```bash
# Build and run with LocalStack
docker-compose up

# Or just the application
docker build -t sqsadmin .
docker run -p 8086:8086 sqsadmin
```

## Architecture Details

### SQS Integration

- The application connects to AWS SQS using the AWS SDK v3
- For development, it can use LocalStack as a local SQS emulator
- Queue operations happen through API routes in `/app/api/queues/`
- The SQS client is configured in `/app/lib/sqs.ts`

### UI Components

- **QueueList**: Displays all queues with pagination and create queue button
- **QueueDetail**: Shows queue attributes and messages with options to send/delete
- **CreateQueueModal**: Form for creating new queues with advanced options
- **DeleteQueueModal**: Confirmation dialog for queue deletion

### Key Operations

1. **Listing Queues**: Uses `ListQueuesCommand` to get all available queues
2. **Viewing Messages**: Uses a custom `peekMessages` implementation to view messages without removing them from the queue
3. **Sending Messages**: Posts JSON or text messages to a queue
4. **Creating Queues**: Sets up Standard or FIFO queues with configurable attributes

## Working with AceEditor for JSON

The project uses AceEditor in two places:

1. In the QueueDetail component to view message bodies in a read-only format
2. In the send message dialog for creating and validating JSON messages

The editor is configured with the "dracula" theme which works well in both light and dark modes.

## Port Configuration (8086)

The application has been configured to run on port 8086:

1. In `Dockerfile`: 
   - `EXPOSE 8086`
   - `ENV PORT 8086`

2. In `docker-compose.yml`:
   - Port mapping: `"8086:8086"`

When developing, the application will be available at http://localhost:8086.

## Testing

For local testing without AWS credentials:

1. Start LocalStack using Docker Compose:
   ```bash
   docker-compose up localstack
   ```

2. Configure the application to use LocalStack by setting:
   ```
   SQS_ENDPOINT=http://localhost:4566
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment Considerations

1. **AWS Credentials**: Ensure proper credentials are provided in production
2. **Environment Variables**: Configure appropriate environment variables
3. **Security**: Consider network controls when deploying in production environments
4. **Health Checks**: Add health check endpoints if deploying behind a load balancer

## Reference Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [AWS SQS Documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Ace Editor Documentation](https://ace.c9.io/)
- [LocalStack Documentation](https://docs.localstack.cloud/user-guide/aws/sqs/)

## Known Issues and Limitations

1. Message viewers may not render all types of message payloads optimally
2. When viewing large queues, the peek functionality may not show all messages
3. FIFO queue message groups and deduplication IDs are not fully supported in the UI

## License

This project is open source and available under the MIT License.