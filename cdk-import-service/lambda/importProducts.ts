import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createPresignedUrlWithClient } from './functions/presigned';
import { headers, StatusCode, StatusCodeMessage } from './functions/constants';

const BUCKET = process.env.BUCKET_NAME;
const REGION = process.env.REGION;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const fileName = event.queryStringParameters?.name;

    if (!fileName || !fileName.toLowerCase().endsWith('.csv')) {
      return {
        statusCode: StatusCode.BAD_REQUEST,
        headers,
        body: JSON.stringify({
          message: StatusCodeMessage.BAD_REQUEST,
        }),
      };
    }

    const signedUrl = await createPresignedUrlWithClient({
      region: REGION!,
      bucket: BUCKET!,
      fileName,
    });

    return {
      statusCode: StatusCode.SUCCESS,
      headers,
      body: JSON.stringify({
        signedUrl,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: StatusCode.INTERNAL_SERVER_ERROR,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
      }),
    };
  }
};