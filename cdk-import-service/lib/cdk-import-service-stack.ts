import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class CdkImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const importProductsFile  = new lambda.Function(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'importProducts.handler',
    });

    const api = new apigateway.LambdaRestApi(this, 'importProductsApi', {
      handler: importProductsFile,
      proxy: false,
    });

    const helloResource = api.root.addResource('import');
    helloResource.addMethod('GET');

  }
}
