
import { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import uuid from "./uuidId";

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
            return { productId, transactItems}
}

export { headers, StatusCode, StatusCodeMessage, addProductTranscript};