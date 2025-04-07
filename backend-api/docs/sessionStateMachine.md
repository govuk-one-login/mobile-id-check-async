# Session State Machine

The auth session for the async backend follows a forward-only state machine, as illustrated below.

```mermaid
flowchart LR
    SESSION_CREATED == select document/issue token ==> BIOMETRIC_TOKEN_ISSUED
    SESSION_CREATED == abort ==> SESSION_ABORTED
    
    BIOMETRIC_TOKEN_ISSUED == complete mobile verification ==> BIOMETRIC_VERIFICATION_COMPLETED 
    BIOMETRIC_TOKEN_ISSUED == abort ==> SESSION_ABORTED
```