import { SQSEvent, Context } from 'aws-lambda';
import { handler } from '../lambda/catalogBatchProcess';
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SNS } from 'aws-sdk';

jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('aws-sdk');
jest.mock('../lambda/request/batch/batchItems');
jest.mock('../lambda/request/notifications/templete');

describe('catalogBatchProcess Lambda', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PRODUCT_TABLE_NAME: 'test-products',
      STOCK_TABLE_NAME: 'test-stocks',
      SNS_TOPIC_ARN: 'test-topic-arn',
      REGION: 'us-east-1'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  const mockSQSEvent: SQSEvent = {
    Records: [
      {
        body: JSON.stringify({
          title: 'Test Product',
          description: 'Test Description',
          price: 100,
          count: 5
        }),
        messageId: '1',
        receiptHandle: 'test-receipt',
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1234567890',
          SenderId: 'TESTID',
          ApproximateFirstReceiveTimestamp: '1234567890'
        },
        messageAttributes: {},
        md5OfBody: 'test-md5',
        eventSource: 'aws:sqs',
        eventSourceARN: 'test:arn',
        awsRegion: 'us-east-1'
      }
    ]
  };

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test',
    functionVersion: '1',
    invokedFunctionArn: 'test:arn',
    memoryLimitInMB: '128',
    awsRequestId: 'test-id',
    logGroupName: 'test-group',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  it('should process batchWriteProductsAndStocks successfully', async () => {
    const mockPublish = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    (SNS as unknown as jest.Mock).mockImplementation(() => ({
      publish: mockPublish
    }));

    const mockBatchWrite = jest.requireMock('../lambda/request/batch/batchItems').batchWriteProductsAndStocks;
    mockBatchWrite.mockResolvedValue({});

    await handler(mockSQSEvent, mockContext, () => {});

    expect(mockBatchWrite).toHaveBeenCalled();
  });

  it('should handle invalid SQS messages', async () => {
    const invalidSQSEvent: SQSEvent = {
      Records: [
        {
          ...mockSQSEvent.Records[0],
          body: JSON.stringify({
            title: 'Test Product'
          })
        }
      ]
    };

    const consoleSpy = jest.spyOn(console, 'error');
    await handler(invalidSQSEvent, mockContext, () => {});

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][1].message).toContain(`Cannot read properties of undefined (reading 'toString')`);
  });

  it('should handle empty SQS event', async () => {
    const emptySQSEvent: SQSEvent = {
      Records: []
    };

    const consoleSpy = jest.spyOn(console, 'error');
    await handler(emptySQSEvent, mockContext, () => {});

    expect(consoleSpy).toHaveBeenCalled();
  });
});
