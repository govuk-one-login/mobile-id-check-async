export const getVcIssuedEvent = (userId: string, sessionId: string, journeyId: string, transactionId: string) => {
  return {
    user: {
      user_id: userId,
        session_id
    :
      sessionId,
        govuk_signin_journey_id
    :
        journeyId,
        transaction_id
    :
        transactionId,
    }
  }
}