
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { headers, StatusCode, StatusCodeMessage } from "./request/constans";
import client, {logRequestMiddleware} from "./middleware/middleware";

const dynamo = DynamoDBDocumentClient.from(client);

const handlerBase = async () => {
    try {
        const PRODUCT_TABLE = process.env.PRODUCT_TABLE_NAME;
        const STOCK_TABLE = process.env.STOCK_TABLE_NAME;

        const [resultProduct, resultStock] = await Promise.all([
            dynamo.send(new ScanCommand({
                TableName: PRODUCT_TABLE
            })),
            dynamo.send(new ScanCommand({
                TableName: STOCK_TABLE
            }))
        ]);
        const products = resultProduct.Items || [];
        const stocks = resultStock.Items || [];
        const combinedItems = products.map(product => {
            const stock = stocks.find(stock => stock.product_id === product.id);
            return {
                ...product,
                count: stock ? stock.count : 0
            };
        });

        return {
            statusCode: StatusCode.SUCCESS,
            headers,
            body: JSON.stringify(combinedItems)
        };
    } catch (error) {
        console.error('Error:', error as Error);
        return {
            statusCode: StatusCode.INTERNAL_SERVER_ERROR,
            headers,
            body: JSON.stringify({
                message: StatusCodeMessage.INTERNAL_SERVER_ERROR,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};

export const handler = logRequestMiddleware(handlerBase);