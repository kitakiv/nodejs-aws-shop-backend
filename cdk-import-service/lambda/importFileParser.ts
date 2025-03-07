import { S3Event, Context, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Product, logger } from './functions/constants';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

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

      const body = response.Body as Readable;
      if (!body) {
        throw new Error('No body in the response');
      }

      await new Promise((resolve, reject) => {
        const result: Product[] = [];

        body
        .pipe(csv())
          .on('data', (data) => {
            result.push(data);
          })
          .on('error', (error) => {
            logger.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('end', () => {
            logger.info('CSV parsing completed', JSON.stringify(result, null, 2));
            resolve(null);
          });
      });
    } catch (error) {
      logger.error('Error:', JSON.stringify(error, null, 2));
    }
  }
};