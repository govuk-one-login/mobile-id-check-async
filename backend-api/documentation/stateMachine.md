# State Machine

The auth session for the async backend follows a forward-only state machine, as illustrated below.

```mermaid
flowchart LR
    ASYNC_AUTH_SESSION_CREATED == start biometric session ==> ASYNC_BIOMETRIC_TOKEN_ISSUED
    ASYNC_AUTH_SESSION_CREATED == abort ==> ASYNC_AUTH_SESSION_ABORTED

    ASYNC_BIOMETRIC_TOKEN_ISSUED == finish biometric session ==> ASYNC_BIOMETRIC_SESSION_FINISHED
    ASYNC_BIOMETRIC_TOKEN_ISSUED == abort ==> ASYNC_AUTH_SESSION_ABORTED

    ASYNC_BIOMETRIC_SESSION_FINISHED == result sent to IPV ==> ASYNC_RESULT_SENT
    ASYNC_BIOMETRIC_SESSION_FINISHED == abort ==> ASYNC_AUTH_SESSION_ABORTED
```


