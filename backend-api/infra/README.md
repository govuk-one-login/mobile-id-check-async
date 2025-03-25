## Cloudformation template structure

The `template.yaml` contains the Cloudformation resources that are deployed into AWS. This is made up of smaller `*.yaml` files that live in the `backend-api/infra` directory. 

The `*.yaml` files in the `backend-api/infra` folder are organised by technology. There is also a `parent.yaml` which defines the Conditionals, Mappings and Globals.

### Generating the template.yaml
When any changes are made to the `*.yaml` files in the `backend/infra` folder, the `backend-api/template.yaml` needs to be regenerated:

```bash
# From /backend-api
npm run build:infra
```

This script finds all `*.yaml` files in the `backend-api/infra` folder. If you add/remove/update a `.yaml` file in this directory the script will update the `backend-api/template.yaml` automatically.

Note: this script is also run in the pre-commit hook to ensure that the `backend-api/template.yaml` is up-to-date.

Merging templates requires rain to be installed. See https://github.com/aws-cloudformation/rain for installation instructions.

### Adding or updating new infrastructure
1) If the infrastructure already exists, update the `infra/*.yaml` file with the required changes.
2) If there isn't, create a file in the relative folder and add resource into it.
3) Generate the `template.yaml`

### Deleting infrastructure
1) Locate the infrastructure to be removed in the `infra` folder.
2) Check if it uses resources from the `parent.yaml` and remove these, if no other resources depend on it.
3) Delete the `infra/*.yaml` file if empty
4) Generate the `template.yaml`

### CloudWatch Alarms
All CloudWatch Alarms must have a runbook linked in the alarm description. The alarm must be listed in the runbook with the following details;
- What triggers the alarm
- The impact on the end user
- Possible causes
- Details about what to do next

Canary alarms are designed to rollback lambdas if deployments fail. They do not require developers to take any further steps, therefore they do not need runbooks.

### Infrastructure tests
Infrastructure tests target the `backend-api/template.yaml` given this is the template that is deployed to AWS. 

The exception to this is a test in `tests/infra-tests/template.test.ts` that validates the `backend-api/template.yaml` contains the same resources defined in all `*.yaml` files in the `backend-api/infra` folder.