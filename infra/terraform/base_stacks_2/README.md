# Before applying changes

For initial configuration please refer to the README file located in ./infra/terraform

# Order of deployments

This base_stacks_2 directory is only to be deployed after the deployment of the original base_stacks as dns_records.tf is dependent on dns.tf being deployed first.

After deploying base_stacks for the first time if you have not yet registered your domain name with the base Route53 record (https://github.com/govuk-one-login/domains), please read the team manual linked below.

If your domain has already been registered then you can move to deploy base_stacks_2

# Guide here for registering a new domain name within Digital Identity.

https://team-manual.account.gov.uk/development-standards-processes/coding-practices-and-processes/dns-configuration/#requesting-a-new-dns-record-for-your-service