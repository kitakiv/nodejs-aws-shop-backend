
import {
    DynamoDBDocumentClient, TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { headers, StatusCode, StatusCodeMessage, addProductTranscript} from "./request/constans";
import client, { logRequestMiddleware } from "./middleware/middleware";

const dynamo = DynamoDBDocumentClient.from(client);


const handlerBase = async (event: { body: string }) => {
    const body = JSON.parse(event.body);
    try {
        const PRODUCT_TABLE = process.env.PRODUCT_TABLE_NAME;
        const STOCK_TABLE = process.env.STOCK_TABLE_NAME;
        if (!body || !body.title || !body.description || !body.price || !body.count || typeof body.title !== 'string' || typeof body.description !== 'string' || typeof body.price !== 'number' || typeof body.count !== 'number') {
            return {
                statusCode: StatusCode.BAD_REQUEST,
                headers,
                body: JSON.stringify({
                    message: StatusCodeMessage.BAD_REQUEST
                })
            };
        }
        const transactItems = addProductTranscript(body, PRODUCT_TABLE!, STOCK_TABLE!);
        await dynamo.send(new TransactWriteCommand(transactItems.transactItems));
        return {
            statusCode: StatusCode.CREATED,
            headers,
            body: JSON.stringify(
                {
                    id: transactItems.productId,
                    title: body.title,
                    description: body.description,
                    price: body.price,
                    count: body.count
                }
            )
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