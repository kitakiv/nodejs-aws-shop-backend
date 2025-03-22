import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { config } from 'dotenv';


config();

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

    const createProductTopic = new sns.Topic(this, 'createProductTopic', {
      topicName: 'createProductTopic',
      displayName: 'Create product topic'
    })

    createProductTopic.addSubscription(new subscriptions.EmailSubscription(process.env.HIGH_PRICE!, {
      json: true,
      filterPolicy: {
        price: sns.SubscriptionFilter.numericFilter({
          greaterThanOrEqualTo: 100
        })
      }
    }));
    createProductTopic.addSubscription(new subscriptions.EmailSubscription(process.env.LOW_PRICE!, {
      json: true,
      filterPolicy: {
        price: sns.SubscriptionFilter.numericFilter({
          lessThan: 100
        })
      }
    }));

    const params = {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        PRODUCT_TABLE_NAME: productTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
        SNS_TOPIC_ARN: createProductTopic.topicArn,
        REGION: cdk.Stack.of(this).region,
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
    //dynamodb
    productTable.grantReadData(getProductsList);
    productTable.grantReadData(getProductById);
    stockTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductById);
    productTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);
    stockTable.grantWriteData(catalogBatchProcess);
    productTable.grantWriteData(catalogBatchProcess);
    //sns
    createProductTopic.grantPublish(catalogBatchProcess);
    //sqs
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);


  }
}
