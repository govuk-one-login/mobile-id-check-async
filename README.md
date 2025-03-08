# One Login Async Credential Service
This is the asynchronous 'V2' backend service for the Document Checking Mobile and Web Credential Issuer (DCMAW CRI). 

Note, this repository is structured as a monorepo. For further docs, see the READMEs within the sub-directories.

# GitHub Actions

Ensure npm scrips are named as follows:
`lint`: Linters for ci checks
`format:check`: Format check for ci check
`test`: Tests for ci check
`infra:format:verify`: Format check for ci check, if using rain
`test:unit`: Tests needed for SonarQube Scans

Guidance for using GitHub Actions

- Secrets can be inherited unless secret names need to be changed to suit called workflow
- CI-check workflow doesn't run when PR is in draft. Workflows can be manually run if devs wish to confirm changes before PR is ready for review
- Use `npm clean-install` to install packages using the details in package-lock
- Alphabetise secrets and inputs
- Secrets and inputs must have a description
- `sam validate --lint` is to be used over `cfn-lint` because it's already included in the ubuntu version
- ubuntu24.04 is being used instead of 22.04 as it's smaller and doesn't include so many unnecessary packages
- reusable workflows have been used over composite actions as they allow devs to see each step when running the pipelines. Composite actions would condense all the steps into one with less visibility with errors.
- before updating a job to install a package, check if it already exists in the ubuntu version in it's [readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
