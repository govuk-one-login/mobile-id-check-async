# One Login Async Credential Service
This is the backend service supporting the asyncronous journey within the One Login application.

It follows the Client credentials grant flow from the OAuth2.0 Framework [see here for reference docs](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4).


## Dependencies:
- AWS CLI
- AWS SAM
- node v.20
- npm

## Running tests

### To run unit tests

- From the /src folder, run the unit test command

```bash
npm run test
```