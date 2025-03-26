# Session State Machine

The auth session for the async backend follows a forward-only state machine, as illustrated below.

```mermaid
flowchart LR
    ASYNC_AUTH_SESSION_CREATED == start biometric session ==> ASYNC_BIOMETRIC_TOKEN_ISSUED == biometric token issued ==> ASYNC_BIOMETRIC_SESSION_FINISHED == biometric session finished ==> ASYNC_AUTH_SESSION_ABORTED
```