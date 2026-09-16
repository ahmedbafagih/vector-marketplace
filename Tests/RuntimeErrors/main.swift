import Foundation
let privateText="Buyer message: private example, not a diagnostic"
let quota=Runtime.failureMessage(provider:"Codex",diagnostic:privateText+"\nERROR: You've hit your usage limit.")
precondition(quota.contains("usage limit reached"))
precondition(!quota.contains(privateText))
let generic=Runtime.failureMessage(provider:"Claude Code",diagnostic:privateText)
precondition(generic.contains("request failed"))
precondition(!generic.contains(privateText))
precondition(Runtime.failureMessage(provider:"Codex",diagnostic:"Unauthorized authentication").contains("sign-in needs attention"))
print("PASS runtime errors classify usage/authentication without exposing task or buyer text")
