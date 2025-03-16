import { BatchWriteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ProductWithId, Stock } from "../constans";
import { marshall } from "@aws-sdk/util-dynamodb";

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

export { batchWriteProductsAndStocks };