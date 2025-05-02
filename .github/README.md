# SQS Admin

A web-based administration tool for Amazon Simple Queue Service (SQS), built with Next.js.

![SQS Admin Screenshot](https://github.com/ronreiter/sqsadmin/raw/main/.github/images/screenshot.png)

## Features

- View your SQS queues and their statistics in a paginated table
- Create new Standard and FIFO queues with advanced configuration
- Send JSON or text messages to queues
- View messages in queues with syntax highlighting
- Delete messages from queues
- Delete queues when no longer needed
- Auto-refresh message view
- Dark mode support

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- An AWS account with SQS access
- AWS credentials configured locally
- Optional: Docker and Docker Compose for containerized usage

### AWS Credentials Setup

Before running the application, make sure your AWS credentials are properly configured. You can do this in several ways:

1. **AWS CLI**: Run `aws configure` and enter your access key, secret key, and default region.
2. **Environment Variables**: Set the following environment variables:
   ```
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=your_region
   ```
3. **Create a .env.local file** in the project root with:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=your_region
   # Optional: Use a local endpoint for development
   # SQS_ENDPOINT=http://localhost:4566
   ```

### Local Development

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:8086](http://localhost:8086) with your browser to use the application.

### Using Docker

You can run the application with Docker, optionally with LocalStack for local SQS testing:

```bash
# Build and run the application with a local SQS (LocalStack)
docker-compose up

# Or run just the application (connecting to your AWS account)
docker build -t sqsadmin .
docker run -p 8086:8086 -e AWS_ACCESS_KEY_ID=your-key -e AWS_SECRET_ACCESS_KEY=your-secret -e AWS_REGION=your-region sqsadmin
```

## Using with LocalStack

For local development without connecting to AWS, [LocalStack](https://github.com/localstack/localstack) provides a local AWS cloud stack.

The Docker Compose file includes LocalStack configured for SQS:

```bash
docker-compose up
```

This will start both the application and LocalStack. The application will be configured to use the LocalStack SQS service automatically.

## Usage

### Viewing Queues

The home page displays a list of all your SQS queues with basic information such as:
- Queue name
- Queue type (Standard or FIFO)
- Number of messages available
- Number of messages in flight (being processed)

### Creating Queues

Click the "Create Queue" button to create a new SQS queue. You can configure:
- Queue name
- Queue type (Standard or FIFO)
- Advanced settings like visibility timeout, message retention period, and delay seconds

### Queue Details

Click on a queue to view its details page, where you can:
- Send new messages (plain text or JSON)
- View existing messages in the queue with syntax highlighting
- Delete messages from the queue
- Enable auto-refresh to see new messages as they arrive
- Delete the queue entirely

## Development

This is a [Next.js](https://nextjs.org) project with the following structure:

- `/app/lib/sqs.ts` - SQS client and utility functions
- `/app/api/` - API routes for SQS operations
- `/app/components/` - React components for the UI
- `/app/queues/[queueUrl]/` - Queue detail page

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region to connect to | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required (or `test` for local development) |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required (or `test` for local development) |
| `SQS_ENDPOINT` | Custom SQS endpoint for local development | AWS SQS endpoint |
| `PORT` | The port to run the application on | `8086` |

## Security Considerations

- This application expects AWS credentials to be properly configured in your environment
- It only provides access to SQS queues that your configured AWS credentials have access to
- Consider deploying the application with appropriate network controls if using in a production environment
- For local testing, you can use LocalStack to avoid using real AWS resources

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## GitHub Pages

Visit our [GitHub Pages site](https://ronreiter.github.io/sqsadmin/) for more information about SQS Admin, including features, screenshots, and getting started guides.

## License

This project is open source and available under the [MIT License](LICENSE).

Created by Ron Reiter (MIT License)