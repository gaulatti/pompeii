#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { config } from 'dotenv';
import { PompeiiStack } from '../lib';

config();

const app = new cdk.App();
new PompeiiStack(app, 'Pompeii', {});
