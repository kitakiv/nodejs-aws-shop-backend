import { SQSHandler, SQSEvent, Context } from "aws-lambda";
import { batchWriteProductsAndStocks, ProductWithId, Stock } from  './request/constans';
import { randomUUID } from "crypto";
import client from "./middleware/middleware";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SNS } from "aws-sdk";

const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME;

const dynamo = DynamoDBDocumentClient.from(client);
const sns = new SNS({ region: process.env.REGION });

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
  try {
    const productEntity: ProductWithId[] = [];
    const stockEntity: Stock[] = [];
    const batchItems: { title: string; description: string; price: number | string; count: number | string; }[] = event.Records.map((record) => JSON.parse(record.body));
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
    await sns.publish({
      Subject: 'Products created',
      Message: JSON.stringify({
        message: 'Products created',
        data: batchItems,
        response: response
      }),
      TopicArn: process.env.SNS_TOPIC_ARN,
    }).promise();
  } catch (error) {
    console.error('Error:', error);
  }
};