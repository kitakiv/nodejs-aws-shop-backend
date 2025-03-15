import { S3Event, Context, S3Handler } from 'aws-lambda';
import { SendMessageBatchCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Product, logger } from './functions/constants';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { JobDefinitionBase } from 'aws-cdk-lib/aws-batch';
import { stringify } from 'querystring';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const REGION = process.env.REGION;
const DESTINATION_PREFIX = 'parsed/';

const s3 = new S3Client({ region: REGION });
const sqs = new SQSClient({ region: REGION });

export const handler: S3Handler = async (event: S3Event, context?: Context) => {
  const batchSize = 5;
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
      const result: { Id: `${string}-${string}-${string}-${string}-${string}`; MessageBody: string; }[] = [];

      const body = response.Body as Readable;
      if (!body) {
        throw new Error('No body in the response');
      }

      await new Promise((resolve, reject) => {
        body
          .pipe(csv())
          .on('data', (data) => {
            if (data.title && data.description && data.price && data.count) {
              result.push(
                {
                  Id: randomUUID(),
                  MessageBody: JSON.stringify(
                    {
                      title: data.title,
                      description: data.description,
                      price: Number(data.price),
                      count: Number(data.count),
                    } as Product
                  )
                }
              )
            }
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

      for (let i = 0; i < result.length; i += batchSize) {
        const batch = result.slice(i, i + batchSize);
        const sendMessageBatchCommand = new SendMessageBatchCommand({
          QueueUrl: SQS_QUEUE_URL,
          Entries: batch,
        });
        await sqs.send(sendMessageBatchCommand);
      }
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