
import { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import uuid from "./uuidId";
import { marshall } from "@aws-sdk/util-dynamodb";
import { BatchWriteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { T } from "@faker-js/faker/dist/airline-BXaRegOM";
import { l } from "vite/dist/node/types.d-aGj9QkWt";

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
}

interface Product {
    description: string,
    title: string,
    price: number,
    count: number
}

interface Stock {
    product_id: string,
    count: number
}

interface ProductWithId {
    id: string,
    description: string,
    title: string,
    price: number,

}

enum StatusCode {
    BAD_REQUEST = 400,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
    CREATED = 201,
    SUCCESS = 200
}

enum StatusCodeMessage {
    BAD_REQUEST = 'Missing required fields example {description: string, title: string, price: number, count: number}',
    NOT_FOUND = 'Product not found',
    INTERNAL_SERVER_ERROR = 'Internal server error',
    CREATED = 'Created',
    SUCCESS = 'Success'
}
function addProductTranscript(product: Product, PRODUCT_TABLE: string, STOCK_TABLE: string) {
    const productId = uuid();
    const paramsProduct = {
        TableName: PRODUCT_TABLE,
        Item: {
            id: `${productId}`,
            title: product.title,
            description: product.description,
            price: product.price
        }
    };
    const paramsStock = {
        TableName: STOCK_TABLE,
        Item: {
            product_id: `${productId}`,
            count: product.count
        }
    };
    const transactItems: TransactWriteCommandInput = {
        TransactItems: [
            {
                Put: {
                    TableName: paramsProduct.TableName,
                    Item: paramsProduct.Item,
                    ConditionExpression: 'attribute_not_exists(id)'
                }
            },
            {
                Put: {
                    TableName: paramsStock.TableName,
                    Item: paramsStock.Item,
                    ConditionExpression: 'attribute_not_exists(product_id)'
                }
            }
        ]
    };
    return { productId, transactItems }
}

async function retryUnprocessedItems(unprocessedItems: any, maxRetries = 3, dynamoDb: DynamoDBClient) {
    let retryCount = 0;
    let itemsToRetry = unprocessedItems;

    while (Object.keys(itemsToRetry).length > 0 && retryCount < maxRetries) {
        await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 100)
        );

        const command = new BatchWriteItemCommand({
            RequestItems: itemsToRetry
        });

        try {
            const response = await dynamoDb.send(command);
            itemsToRetry = response.UnprocessedItems || {};
        } catch (error) {
            console.error(`Retry ${retryCount + 1} failed:`, error);
        }

        retryCount++;
    }

    if (Object.keys(itemsToRetry).length > 0) {
        console.error("Failed to process all items after retries");
    }
}


async function batchWriteProductsAndStocks(products: ProductWithId[], stocks: Stock[], dynamoDb: DynamoDBClient, TABLE_NAME: string, STOCK_TABLE: string) {
    try {
        const productItems = products.map(product => ({
            PutRequest: {
                Item: marshall({
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    price: product.price
                })
            }
        }));

        const stockItems = stocks.map(stock => ({
            PutRequest: {
                Item: marshall({
                    product_id: stock.product_id,
                    count: stock.count
                })
            }
        }));

        const command = new BatchWriteItemCommand({
            RequestItems: {
                [TABLE_NAME]: productItems,
                [STOCK_TABLE]: stockItems
            }
        });

        const response = await dynamoDb.send(command);
        if (response.UnprocessedItems &&
            Object.keys(response.UnprocessedItems).length > 0) {
            console.log("Unprocessed items:", response.UnprocessedItems);
            await retryUnprocessedItems(response.UnprocessedItems, 5, dynamoDb);
        }

        return response;
    } catch (error) {
        console.error("Error in batch write:", error);
        throw error;
    }
}

export { headers, StatusCode, StatusCodeMessage, addProductTranscript, batchWriteProductsAndStocks, ProductWithId, Stock };