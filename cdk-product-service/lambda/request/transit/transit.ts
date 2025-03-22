import { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { Product } from "../constans";
import uuid from "../uuidId";

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

export { addProductTranscript }