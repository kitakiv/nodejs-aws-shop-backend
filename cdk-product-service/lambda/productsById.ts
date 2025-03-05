
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { headers, StatusCode, StatusCodeMessage } from "./request/constans";
import client, {logRequestMiddleware} from "./middleware/middleware";

const dynamo = DynamoDBDocumentClient.from(client);

const handlerBase = async (event: { pathParameters: { id: string } }) => {
    const productId = event.pathParameters?.id;
    try {
            const PRODUCT_TABLE = process.env.PRODUCT_TABLE_NAME;
            const STOCK_TABLE = process.env.STOCK_TABLE_NAME;
            const [resultProduct, resultStock] = await Promise.all([
                dynamo.send(new QueryCommand({
                    TableName: PRODUCT_TABLE
                    ,KeyConditionExpression: 'id = :id',
                    ExpressionAttributeValues: {
                        ':id': productId
                    }
                })),
                dynamo.send(new QueryCommand({
                    TableName: STOCK_TABLE,
                    KeyConditionExpression: 'product_id = :product_id',
                    ExpressionAttributeValues: {
                        ':product_id': productId
                    }
                }))
            ]);
            if (!resultProduct.Items?.length || !resultStock.Items?.length) {
                return {
                    statusCode: StatusCode.NOT_FOUND,
                    headers,
                    body: JSON.stringify({
                        message: StatusCodeMessage.NOT_FOUND
                    })
                };
            }
            const product = resultProduct.Items;
            const stock = resultStock.Items;
            return {
                statusCode: StatusCode.SUCCESS,
                headers,
                body: JSON.stringify({
                    ...product[0],
                    count: stock[0] ? stock[0].count : 0
                })
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