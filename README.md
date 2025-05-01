# SQS Admin

A web-based administration tool for Amazon Simple Queue Service (SQS), built with Next.js.

## Features

- View your SQS queues and their statistics
- Send JSON or text messages to queues
- View messages in queues
- Delete messages from queues
- Auto-refresh message view

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- An AWS account with SQS access
- AWS credentials configured locally

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
   ```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to use the application.

## Usage

### Viewing Queues

The home page displays a list of all your SQS queues with basic information such as:
- Queue name
- Number of messages available
- Number of messages in flight (being processed)

### Queue Details

Click on a queue to view its details page, where you can:
- Send new messages (plain text or JSON)
- View existing messages in the queue
- Delete messages from the queue
- Enable auto-refresh to see new messages as they arrive

## Development

This is a [Next.js](https://nextjs.org) project with the following structure:

- `/app/lib/sqs.ts` - SQS client and utility functions
- `/app/api/` - API routes for SQS operations
- `/app/components/` - React components for the UI
- `/app/queues/[queueUrl]/` - Queue detail page

## Security Considerations

- This application expects AWS credentials to be properly configured in your environment
- It only provides access to SQS queues that your configured AWS credentials have access to
- Consider deploying the application with appropriate network controls if using in a production environment

## License

This project is open source and available under the [MIT License](LICENSE).