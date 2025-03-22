
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

interface Stock {
    product_id: string,
    count: number
}

interface ProductWithId {
    id: string,
    description: string,
    title: string,
    price: number,

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


export { headers, StatusCode, StatusCodeMessage, ProductWithId, Stock, Product };