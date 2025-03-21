import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';


export class CdkImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const uploadBucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'nodejs-aws-shop-backend'
    );

    const catalogItemsQueue = sqs.Queue.fromQueueAttributes(
      this,
      'catalogItemsQueue',
      {
        queueName: 'catalogItemsQueue',
        queueArn: `arn:aws:sqs:${cdk.Stack.of(this).region}:${cdk.Aws.ACCOUNT_ID}:catalogItemsQueue`,
      }
    )


    const importProductsFile = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'importProducts.handler',
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
        REGION: cdk.Stack.of(this).region,
      }
    });

    const importFileParser = new lambda.Function(this, 'importFileParser', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'importFileParser.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        REGION: cdk.Stack.of(this).region,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
      }
    });

    const api = new apigateway.LambdaRestApi(this, 'importProductsApi', {
      handler: importProductsFile,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'ImportAuthorizer', {
      handler: lambda.Function.fromFunctionArn(
        this,
        'AuthorizerFunction',
        cdk.Fn.importValue('AuthorizerFunctionArn')
      ),
      identitySource: apigateway.IdentitySource.header('Authorization'),
      resultsCacheTtl: cdk.Duration.seconds(0),
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET',
      new apigateway.LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    }
    );

    uploadBucket.grantPut(importProductsFile);
    uploadBucket.grantReadWrite(importFileParser);
    uploadBucket.grantDelete(importFileParser);

    catalogItemsQueue.grantSendMessages(importFileParser);
    //grant importProductsFile
    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [`${uploadBucket.bucketArn}/uploaded/*`],
      })
    );
    //trigger importFileParser
    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      {
        prefix: 'uploaded/',
        suffix: '.csv',
      }
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

  }
}
