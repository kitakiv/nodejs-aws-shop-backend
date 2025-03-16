
import { DynamoDBDocumentClient, TransactWriteCommand , TransactWriteCommandInput} from "@aws-sdk/lib-dynamodb";
import client from "../lambda/middleware/middleware";
import { faker } from '@faker-js/faker';
import {addProductTranscript} from "../lambda/request/transit/transit";
const docClient = DynamoDBDocumentClient.from(client);

function generateData(count: number) {
    const data = new Array(count).fill(null).map(() => ({
        description: faker.commerce.productDescription(),
        title: faker.commerce.product(),
        count: faker.number.int({ min: 1, max: 1000 }),
        price: faker.number.int({ min: 1, max: 1000 }),
    }));
    return data;
}

async function addProduct() {
  const data = generateData(6);
    data.forEach(async (item) => {
        const params: TransactWriteCommandInput = addProductTranscript(item, process.env.PRODUCT_TABLE_NAME! || 'ProductTableCdk', process.env.STOCK_TABLE_NAME! || 'StockTableCdk').transactItems;
        try {
            const response = await docClient.send(new TransactWriteCommand(params));
            console.log("Success:", response);
        } catch (error) {
            console.error("Error:", error);
        }
      })
}

addProduct();