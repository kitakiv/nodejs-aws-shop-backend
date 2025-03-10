import { S3Event, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { handler } from '../lambda/importFileParser';
import { Readable } from 'stream';
import { logger } from '../lambda/functions/constants';

jest.mock('@aws-sdk/client-s3');
jest.mock('../lambda/functions/constants', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('importFileParser Lambda', () => {
  const mockS3Client = {
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (S3Client as jest.Mock).mockImplementation(() => mockS3Client);
  });

  const mockEvent: S3Event = {
    Records: [{
      s3: {
        bucket: {
          name: 'test-bucket',
        },
        object: {
          key: 'uploaded/test.csv',
        },
      },
    }],
  } as any;

  const mockContext: Context = {} as Context;

  it('should successfully process CSV file', async () => {
    const mockCsvData = 'title,description\nProduct1,Description1\nProduct2,Description2';
    const mockReadable = Readable.from([mockCsvData]);
    mockS3Client.send.mockImplementationOnce(() => ({
      Body: mockReadable,
    }));

    mockS3Client.send.mockImplementationOnce(() => ({}));
    mockS3Client.send.mockImplementationOnce(() => ({}));

    await handler(mockEvent, mockContext, () => {});
    expect(S3Client).toHaveBeenCalledWith({ region: process.env.REGION });
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'uploaded/test.csv',
    });
    expect(CopyObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      CopySource: 'test-bucket/uploaded/test.csv',
      Key: 'parsed/test.csv',
    });

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'uploaded/test.csv',
    });
    expect(logger.info).toHaveBeenCalled();
  });

  it('should handle missing body in response', async () => {
    mockS3Client.send.mockImplementationOnce(() => ({
      Body: null,
    }));
    await handler(mockEvent, mockContext, () => {});
    expect(logger.error).toHaveBeenCalled();
  });


  it('should handle empty Records array', async () => {
    const emptyEvent: S3Event = {
      Records: [],
    } as any;
    await handler(emptyEvent, mockContext, () => {});
    expect(mockS3Client.send).not.toHaveBeenCalled();
  });
});
