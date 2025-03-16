#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkProductServiceStack } from '../lib/cdk-product-service-stack';

const app = new cdk.App();
new CdkProductServiceStack(app, 'CdkProductServiceStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
});