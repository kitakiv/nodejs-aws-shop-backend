import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class CdkAuthorizationServiceStack extends cdk.Stack {
  authorizerArn: string;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizer = new lambda.Function(this, 'basicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'basicAuthorizer.handler',
      code: lambda.Code.fromAsset('lambda')
    });

    new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
      value: basicAuthorizer.functionArn,
      exportName: 'AuthorizerFunctionArn'
    });

  }
}
