import { SsmService } from './ssmService'
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'

describe('SSM Service', () => {
  describe('Given there is an error calling SSM', () => {
    it('Returns a Log response with error message', async () => {
      const ssmService = new SsmService()
      const ssmMock = mockClient(SSMClient)
      ssmMock.on(GetParameterCommand).rejects('SSM Error')

      const result = await ssmService.getClientCredentials()

      expect(result.isLog).toBe(true)
      expect(result.value).toEqual('Client Credentials not found')
    })
  })

  describe('Given the request to SSM is successful', () => {
    describe.each([
      {
        clientCredentials: undefined,
        scenario: 'is undefined',
        expectedErrorMessage: 'Client Credentials is null or undefined'
      },
      {
        clientCredentials: "{}}",
        scenario: 'is invalid JSON',
        expectedErrorMessage: 'Client Credentials is not valid JSON'
      },
      {
        clientCredentials: JSON.stringify({}),
        scenario: 'is not an array',
        expectedErrorMessage: 'Parsed Client Credentials array is malformed'
      },
      {
        clientCredentials: JSON.stringify([]),
        scenario: 'is an empty array',
        expectedErrorMessage: 'Parsed Client Credentials array is malformed'
      },
      {
        clientCredentials: JSON.stringify([{client_id: "123"}]),
        scenario: 'contains an object with incorrect keys',
        expectedErrorMessage: 'Parsed Client Credentials array is malformed'
      },
      {
        clientCredentials: JSON.stringify([{ client_id: [], issuer: 'mockIssuer', salt: 'mockSalt', hashed_client_secret: 'mockHashedClientSecret' }]),
        scenario: 'contains an object where not all key types are in a "string" format',
        expectedErrorMessage: 'Parsed Client Credentials array is malformed'
      },
      {
        clientCredentials: JSON.stringify([{ client_id: 'mockClientId', issuer: 'mockIssuer', salt: 'mockSalt', hashed_client_secret: 'mockHashedClientSecret' }, { client_id: [], issuer: 'mockIssuer', salt: 'mockSalt', hashed_client_secret: 'mockHashedClientSecret' }]),
        scenario: 'contains multiple objects with where at least one key is incorrect',
        expectedErrorMessage: 'Parsed Client Credentials array is malformed'
      }
    ])('Given the Client Credential array $scenario', ({clientCredentials, expectedErrorMessage}) => {
      it('Returns a Log response with error message', async () => {
        const ssmService = new SsmService()
        const ssmMock = mockClient(SSMClient)
        ssmMock
          .on(GetParameterCommand)
          .resolves({ Parameter: { Value: clientCredentials } })

        const result = await ssmService.getClientCredentials()

        expect(result.isLog).toBe(true)
        expect(result.value).toEqual(expectedErrorMessage)
      })
    })

    describe('Given the Credential object is valid', () => {

      it('Returns a Value response with Credential object', async () => {
        const ssmService = new SsmService()
        const ssmMock = mockClient(SSMClient)
        ssmMock
          .on(GetParameterCommand)
          .resolves({
            Parameter: {
              Value: JSON.stringify([{
                client_id: 'mockClientId',
                issuer: 'mockIssuer',
                salt: 'mockSalt',
                hashed_client_secret: 'mockHashedClientSecret'
              }]),
            }
          })

        const result = await ssmService.getClientCredentials()

        expect(result.isLog).toBe(false)
        expect(result.value).toStrictEqual([{
          client_id: 'mockClientId',
          issuer: 'mockIssuer',
          salt: 'mockSalt',
          hashed_client_secret: 'mockHashedClientSecret'
        }])
      })

      it('Utilizes cache for subsequent requests', async () => {
        const ssmService = new SsmService()
        const ssmMock = mockClient(SSMClient)
        ssmMock
        .on(GetParameterCommand)
        .resolves({
          Parameter: {
            Value: JSON.stringify([{
              client_id: 'mockClientId',
              issuer: 'mockIssuer',
              salt: 'mockSalt',
              hashed_client_secret: 'mockHashedClientSecret'
            }]),
          }
        })

        ssmService.resetCache();

        // First call should populate the cache
        await ssmService.getClientCredentials()
        // Second call should use cache
        await ssmService.getClientCredentials()
  
        // Expect SSM to have been called only once, since the second call uses cache
        expect(ssmMock.calls()).toHaveLength(1)
      });
  
      it('Refreshes cache after TTL expires', async () => {
        const ssmService = new SsmService()
        const ssmMock = mockClient(SSMClient)

        jest.useFakeTimers();

        ssmMock
        .on(GetParameterCommand)
        .resolves({
          Parameter: {
            Value: JSON.stringify([{
              client_id: 'mockClientId',
              issuer: 'mockIssuer',
              salt: 'mockSalt',
              hashed_client_secret: 'mockHashedClientSecret'
            }]),
          }
        })

        ssmService.resetCache();
        await ssmService.getClientCredentials()
        // Simulate time passing to exceed cache TTL
        jest.advanceTimersByTime(ssmService.cacheTTL + 1)
        // This call should refresh cache
        await ssmService.getClientCredentials()

        // Expect SSM to have been called twice: once to populate, once to refresh after TTL
        expect(ssmMock.calls()).toHaveLength(2)
        jest.useRealTimers();
      });
    })
  })
})
