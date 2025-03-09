import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../lambda/importProducts';
import { StatusCode, StatusCodeMessage } from '../lambda/functions/constants';

jest.mock('../lambda/functions/presigned', () => ({
  createPresignedUrlWithClient: jest.fn().mockImplementation(() => 
    Promise.resolve('https://mock-signed-url.com')
  )
}));

describe('importProducts handler', () => {
  const mockHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return signed URL when valid CSV filename is provided', async () => {
    const mockEvent = {
        queryStringParameters: {
            name: 'test.csv'
        }
    } as unknown as APIGatewayProxyEvent;
    const response = await handler(mockEvent);
    expect(response.statusCode).toBe(StatusCode.SUCCESS);
    expect(JSON.parse(response.body)).toBe('https://mock-signed-url.com');
  });

  test('should return BAD_REQUEST when filename is missing', async () => {
    const mockEvent = {
      queryStringParameters: {}
    } as APIGatewayProxyEvent;
    const response = await handler(mockEvent);
    expect(response.statusCode).toBe(StatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body)).toEqual({
      message: StatusCodeMessage.BAD_REQUEST
    });
  });

  test('should return BAD_REQUEST when file is not CSV', async () => {
    const mockEvent = {
        queryStringParameters: {
            name: 'test.txt'
        }
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(mockEvent);

    expect(response.statusCode).toBe(StatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body)).toEqual({
      message: StatusCodeMessage.BAD_REQUEST
    });
  });

  test('should return INTERNAL_SERVER_ERROR when createPresignedUrlWithClient fails', async () => {
    // Arrange
    const mockEvent = {
        queryStringParameters: {
            name: 'test.csv'
        }
    } as unknown as APIGatewayProxyEvent;
    const { createPresignedUrlWithClient } = require('../lambda/functions/presigned');
    createPresignedUrlWithClient.mockImplementationOnce(() =>
      Promise.reject(new Error('Failed to create signed URL'))
    );
    const response = await handler(mockEvent);
    expect(response.statusCode).toBe(StatusCode.INTERNAL_SERVER_ERROR);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Internal server error'
    });
  });

  test('should handle event with null queryStringParameters', async () => {
    const mockEvent = {
      queryStringParameters: null
    } as APIGatewayProxyEvent;
    const response = await handler(mockEvent);
    expect(response.statusCode).toBe(StatusCode.BAD_REQUEST);
    expect(JSON.parse(response.body)).toEqual({
      message: StatusCodeMessage.BAD_REQUEST
    });
  });
});

