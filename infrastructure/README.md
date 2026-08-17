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
  invalidation;
- a scoped on-premises IAM user for CloudWatch log delivery and reading the
  configured Secrets Manager entry.

## Inputs

```bash
cp .env.example .env
```

`HOSTED_ZONE_ID` and `HOSTED_ZONE_NAME` identify the existing public zone.
`SECRET_ARN` identifies the Secrets Manager entry whose `UNIQUE_KEY` object is
loaded by the backend. CDK itself does not read or manage the database value.

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
GitHub secrets and variables. Access-key secret outputs are shown only when the
keys are first created; store them immediately in GitHub and the deployment
host.
