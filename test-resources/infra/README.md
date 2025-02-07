## Cloudformation template structure

The `template.yaml` contains the Cloudformation resources that are deployed into AWS. This is made up of smaller `*.yaml` files that live in the `test-resources/infra` directory.

The `*.yaml` files in the `test-resources/infra` folder are organised by test resource and then by resource type. There is also a `parent.yaml` which defines the Conditionals, Mappings and Globals.

### Generating the template.yaml
When any changes are made to the `*.yaml` files in the `test-resources/infra` folder, the `test-resources/template.yaml` needs to be regenerated:

```bash
# From /test-resources
npm run build:infra
```

This script finds all `*.yaml` files in the `test-resources/infra` folder. If you add/remove/update a `.yaml` file in this directory the script will update the `test-resources/template.yaml` automatically.

Note: this script is also run in the pre-commit hook to ensure that the `test-resources/template.yaml` is up-to-date.

Merging templates requires rain to be installed. See https://github.com/aws-cloudformation/rain for installation instructions.

### Adding or updating new infrastructure
1. If the infrastructure already exists, update the `infra/*.yaml` file with the required changes.
1. If there isn't, create a file in the relative folder and add resource into it.
1. Generate the `template.yaml`

### Deleting infrastructure
1. Locate the infrastructure to be removed in the `infra` folder.
1. Check if it uses resources from the `parent.yaml` and remove these, if no other resources depend on it.
1. Delete the `infra/*.yaml` file if empty
1. Generate the `template.yaml`

### Infrastructure tests
Infrastructure tests target the `test-resources/template.yaml` given this is the template that is deployed to AWS.

The exception to this is a test in `tests/infra-tests/template.test.ts` that validates the `test-resources/template.yaml` contains the same resources defined in all `*.yaml` files in the `test-resources/infra` folder.