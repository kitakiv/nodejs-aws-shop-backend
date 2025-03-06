import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class CdkImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const uploadBucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'nodejs-aws-shop-backend'
    );


    const importProductsFile  = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'importProducts.handler',
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
        REGION: cdk.Stack.of(this).region,
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

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET',
      new apigateway.LambdaIntegration(importProductsFile), {
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidatorOptions: {
          validateRequestParameters: true,
        },
      }
    );

    uploadBucket.grantPut(importProductsFile);
    uploadBucket.grantRead(importProductsFile);

    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [`${uploadBucket.bucketArn}/uploaded/*`],
      })
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

  }
}
