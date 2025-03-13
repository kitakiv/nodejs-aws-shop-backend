import { S3Event, Context, S3Handler } from 'aws-lambda';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Product, logger } from './functions/constants';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const REGION = process.env.REGION;
const DESTINATION_PREFIX = 'parsed/';

export const handler: S3Handler = async (event: S3Event, context?: Context) => {
  const s3 = new S3Client({ region: REGION });
  const sqs = new SQSClient({ region: REGION });
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
            logger.info(JSON.stringify(data));
            sqs.send(new SendMessageCommand({
              QueueUrl: SQS_QUEUE_URL,
              MessageBody: JSON.stringify(data),
            }));
          })
          .on('error', (error) => {
            logger.error('Error parsing CSV:', error);
            reject(error);
          })
          .on('end', () => {
            logger.info('CSV parsing completed', JSON.stringify(result));
            resolve(null);
          });
      });
      const destinationKey = DESTINATION_PREFIX + key.replace('uploaded/', '');
      const copyObjectParams = {
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: destinationKey,
      };

      const copyObjectCommand = new CopyObjectCommand(copyObjectParams);
      await s3.send(copyObjectCommand);

      const deleteObjectParams = {
        Bucket: bucket,
        Key: key,
      };

      const deleteObjectCommand = new DeleteObjectCommand(deleteObjectParams);
      await s3.send(deleteObjectCommand);
    } catch (error) {
      logger.error('Error:', JSON.stringify(error));
    }
  }
};