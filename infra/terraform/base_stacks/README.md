https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3157458948/Base+CloudFormation+Stacks


Build Account Only:
- GitHub Identity
- Signer (also dev to allow deployments there?)
- Container Signer

Per Account:
- API Gateway logs
- Certificate expiry
- Grafana?
- Checkov hook
- lambda audit hook
- infra audit hook

- identity broke oidc provider ( different from github identity?)

- ecr scan result logger?

For Other resources (minimum per account):

- VPC (per vpc)
- Build notifications (aws chat bot)
- SAM Deploy Pipeline (each artifact)
- container verifier (if publishing images)
- container image repo
- test image repo



Notes:

Slack ChatBot must be authorised before running the build-notifications stack
