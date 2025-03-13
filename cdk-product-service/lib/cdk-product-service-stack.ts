import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import* as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class CdkProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productTable = new dynamodb.Table(this, 'ProductTableCdk', {
      tableName: 'ProductTableCdk',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'title', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const stockTable = new dynamodb.Table(this, 'StockTableCdk', {
      tableName: 'StockTableCdk',
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'count', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      deliveryDelay: cdk.Duration.seconds(10),
      visibilityTimeout: cdk.Duration.seconds(100),
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });

    const params = {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PRODUCT_TABLE_NAME: productTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    };

    const getProductsList = new lambda.Function(this, 'getProductsListApi', {
      handler: 'products.handler',
      ...params
    });

    const createProduct = new lambda.Function(this, 'createProductApi', {
      handler: 'productsPost.handler',
      ...params
    });

    const getProductById = new lambda.Function(this, 'getProductByIdApi', {
      handler: 'productsById.handler',
      ...params
    });

    const catalogBatchProcess = new lambda.Function(this, 'catalogBatchProcess', {
      handler: 'catalogBatchProcess.handler',
      timeout: cdk.Duration.seconds(30),
      ...params
    });

    catalogBatchProcess.addEventSource(new SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.minutes(3),
      reportBatchItemFailures: true
    }));
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);


    const api = new apigateway.RestApi(this, 'ProductApi', {
      deployOptions: {
        stageName: 'dev',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
      }
    });
     // GET /products
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));
    products.addMethod('POST', new apigateway.LambdaIntegration(createProduct));

    // GET /products/{id}
    const product = products.addResource('{id}');
    product.addMethod('GET', new apigateway.LambdaIntegration(getProductById));

    productTable.grantReadData(getProductsList);
    productTable.grantReadData(getProductById);
    stockTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductById);
    productTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

  }
}
