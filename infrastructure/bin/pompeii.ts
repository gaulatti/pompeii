#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { config } from 'dotenv';
import { PompeiiStack } from '../lib';

config();

const app = new cdk.App();
new PompeiiStack(app, 'Pompeii', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
});
