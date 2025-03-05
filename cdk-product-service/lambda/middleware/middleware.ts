
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { c } from "vite/dist/node/types.d-aGj9QkWt";


const client = new DynamoDBClient({});

type LambdaHandler = (event: any, context: any) => Promise<any>;

const logRequestMiddleware = (handler: LambdaHandler): LambdaHandler => {
  return async (event, context) => {
    console.info('Lambda request:', {
      functionName: context.functionName,
      args: event.body,
      parameters: event.pathParameters,
      timestamp: new Date().toISOString()
    });

    return handler(event, context);
  };
};
export default client;
export { logRequestMiddleware };
