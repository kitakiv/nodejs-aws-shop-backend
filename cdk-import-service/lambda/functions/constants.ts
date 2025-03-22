import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();


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
    BAD_REQUEST = 'Invalid or missing file name. Please provide a CSV file name.',
    NOT_FOUND = 'Product not found',
    INTERNAL_SERVER_ERROR = 'Internal server error',
    CREATED = 'Created',
    SUCCESS = 'Success'
}

export { headers, StatusCode, StatusCodeMessage, Product, logger };