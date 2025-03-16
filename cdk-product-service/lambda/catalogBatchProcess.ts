import { SQSHandler, SQSEvent, Context } from "aws-lambda";
import { ProductWithId, Stock } from  './request/constans';
import { randomUUID } from "crypto";
import client from "./middleware/middleware";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SNS } from "aws-sdk";
import { batchWriteProductsAndStocks} from './request/batch/batchItems';
import createNotificationTemplate from './request/notifications/templete';

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;

const dynamo = DynamoDBDocumentClient.from(client);
const sns = new SNS({ region: process.env.REGION });

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
  try {
    const productEntity: ProductWithId[] = [];
    const stockEntity: Stock[] = [];
    const batchItems: { title: string; description: string; price: number; count: number; }[] = event.Records.map((record) => JSON.parse(record.body));
    batchItems.forEach((item) => {
      if (item.count && item.price && item.title && item.description &&
        typeof +item.count === 'number' && typeof +item.price === 'number' && typeof item.title === 'string' && typeof item.description === 'string'
      ) {
        const productId = randomUUID();
        productEntity.push({
          id: productId,
          title: item.title,
          description: item.description,
          price: +item.price,
        });
        stockEntity.push({
          product_id: productId,
          count: +item.count,
        })
      };
    });
    if (batchItems.length === 0) {
      throw new Error('Missing required fields example {description: string, title: string, price: number, count: number}');
    }
    const response = await batchWriteProductsAndStocks(productEntity, stockEntity, dynamo , PRODUCT_TABLE_NAME!, STOCK_TABLE_NAME!);
    await Promise.all(batchItems.map(item =>
      sns.publish({
        MessageStructure: 'json',
        Subject: `New Product: ${item.title}`,
        Message: JSON.stringify(createNotificationTemplate(item)),
        TopicArn: process.env.SNS_TOPIC_ARN,
        MessageAttributes: {
          price: {
            DataType: 'Number',
            StringValue: item.price.toString()
          }
        }
      }).promise()
    ));
  } catch (error) {
    console.error('Error:', error);
  }
};