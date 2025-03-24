## Jira Ticket
<!-- Add your Jira ticket link here. -->
DCMAW-XXXXX

## Description of changes
<!-- 
- Describe what changed and why
- Call out specific areas that need focus in the review
- Call out new patterns and articulate why they're being proposed
- For larger PRs, provide guidance on how best to start the review/understand the change
-->

## Review guidance
<details>
<summary>Review checklist</summary>

### Functional Review
- **Functionality**: Does it meet the acceptance criteria on the ticket and work as expected?
- **Requirements**: Does the code meet functional and non-functional requirements including compliance with programme standards and security gates?

### Security & Compliance
- **Personally Identifiable Information**: Is it possible for PII to be logged?
- **Security Considerations**: Are there any security implications that need to be addressed?

### Quality Assurance
- **Testing**: Is the code well-tested with sufficient coverage to provide confidence in correctness?
- **Edge Cases**: Have edge cases been considered and handled appropriately?

### Code Quality
- **Readability**: Is the code easy to understand for all team members, with clear naming and appropriate documentation?
- **Maintainability**: Is the code easy to change, reuse, and extend?
- **Code Style**: Does it follow our coding conventions and best practices?
- **Code Quality**: Is the code maintainable and following best practices? See [Values, Principles & Practices](https://govukverify.atlassian.net/wiki/spaces/DCMAW/pages/4955865126/ID+Check+Web+-+Values+Principles+and+Practices)

### Observability & Operations
- **Observability**: Are there appropriate logs/metrics that would help debug and monitor the service?
- **Performance**: Are there any performance considerations or potential bottlenecks?

### Documentation
- **Documentation**: Is the code well documented? Is there any existing documentation that needs updating?
- **Comments**: Are complex sections of code adequately commented if the intent is not clear?

### Review PR:
- **Title**: Contains ticket number and clear summary of change
- **Description**: Has clear description of change
</details>

## Evidence
<!-- 
- Provide evidence that changes work as expected
- For UI changes, include screenshots or recordings
- For API changes, include example requests/responses
- For infrastructure changes, include relevant logs or screenshots

Note: Leave this blank if no testing additional to the pull request workflows has been executed

When you should run the test container:
- If you've touched Docker configuration
- If you've added new environment variables
- For UI changes
-->

## Documentation
<!-- 
- Call out if key repository documentation has been updated
- Link to external documentation that has been updated

Note: Leave this blank if no documentation changes have been made
-->