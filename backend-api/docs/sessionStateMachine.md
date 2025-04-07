# Session State Machine

The auth session for the async backend follows a forward-only state machine, as illustrated below.

```mermaid
flowchart LR
    ASYNC_AUTH_SESSION_CREATED == select document/issue token ==> ASYNC_BIOMETRIC_TOKEN_ISSUED
    ASYNC_AUTH_SESSION_CREATED == abort ==> ASYNC_AUTH_SESSION_ABORTED
    
    ASYNC_BIOMETRIC_TOKEN_ISSUED == complete mobile verification ==> ASYNC_BIOMETRIC_SESSION_FINISHED 
    ASYNC_BIOMETRIC_TOKEN_ISSUED == abort ==> ASYNC_AUTH_SESSION_ABORTED
```