import { APIGatewayProxyHandler } from "aws-lambda";

exports.handler = async (event: APIGatewayProxyHandler) => {
    return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ message: "Hello from Lambda" }),
    };
};