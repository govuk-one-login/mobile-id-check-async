# Session State Machine

The auth session for the async backend follows a forward-only state machine, as illustrated below.

```mermaid
flowchart LR
    ASYNC_AUTH_SESSION_CREATED == select document/issue token ==> ASYNC_BIOMETRIC_TOKEN_ISSUED
    ASYNC_AUTH_SESSION_CREATED == abort ==> AUTH_SESSION_ABORTED
    
    ASYNC_BIOMETRIC_TOKEN_ISSUED == complete mobile verification ==> BIOMETRIC_VERIFICATION_COMPLETED 
    ASYNC_BIOMETRIC_TOKEN_ISSUED == abort ==> AUTH_SESSION_ABORTED
```