import { S3Event, Context, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const REGION = process.env.REGION;

export const handler: S3Handler = async (event: S3Event, context: Context) => {
  const s3 = new S3Client({ region: REGION });

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    const getObjectParams = {
      Bucket: bucket,
      Key: key,
    };

    try {
      const getObjectCommand = new GetObjectCommand(getObjectParams);
      const response = await s3.send(getObjectCommand);

      const body = await response.Body?.transformToString();

      console.log('File content:', body);
    } catch (error) {
      console.error('Error:', error);
    }
  }
};