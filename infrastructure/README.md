# Pompeii infrastructure

This standalone CDK package owns Pompeii's AWS resources. It has no dependency
on Macondo or any private infrastructure repository.

It creates:

- a private S3 bucket for the static frontend;
- a CloudFront distribution for `pompeii.<HOSTED_ZONE_NAME>`;
- Route 53 A and AAAA aliases in an existing hosted zone;
- an ACM certificate validated through that zone;
- the retained `/services/pompeii` CloudWatch log group;
- a scoped GitHub Actions IAM user for S3 deployment and CloudFront
  invalidation.
- the Google identity-provider claim mapping on the existing Cognito pool,
  including `email_verified`, so verified federated identities can be
  provisioned safely by Pompeii.

## Inputs

```bash
cp .env.example .env
```

`HOSTED_ZONE_ID` and `HOSTED_ZONE_NAME` identify the existing public zone.
`COGNITO_USER_POOL_ID` identifies the existing shared pool. The stack manages
the Google provider's claim mapping without creating or replacing the pool.

The stack is fixed to `us-east-1`, as required for the CloudFront certificate.
AWS/CDK credentials and `CDK_DEFAULT_ACCOUNT` come from the standard AWS CLI
credential chain.

## Deploy

```bash
npm install
npm test
npm run cdk:synth
npm run deploy
```

After the first deployment, copy the stack outputs into the corresponding
GitHub secrets and variables. The access-key secret output is shown only when
the key is first created; store it immediately in GitHub.
