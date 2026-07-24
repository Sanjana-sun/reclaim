// Common Claim Adjustment Reason Codes (CARC) mapped to the likely denial category and the
// counter-move. Helps route an appeal when the patient has the code from their EOB.
// Reference: X12 CARC list. Not exhaustive; verify against the specific EOB.
module.exports = {
  '50': { reason: 'medical_necessity', note: '"Not deemed a medical necessity." Rebut with the plan\'s own medical policy + physician evidence.' },
  '55': { reason: 'experimental', note: '"Experimental/investigational." Rebut with published guidelines and standard-of-care evidence.' },
  '197': { reason: 'prior_auth', note: '"Precertification/authorization absent." Argue emergency/retro-auth or that auth was not required.' },
  '198': { reason: 'prior_auth', note: '"Precertification exceeded." Seek an exception or reconsideration on the merits.' },
  '96': { reason: 'not_covered', note: '"Non-covered charge(s)." Demand the exact plan exclusion relied upon.' },
  '204': { reason: 'not_covered', note: '"Not covered under the plan." Ask for the specific contractual basis.' },
  '16': { reason: 'coding', note: '"Claim lacks information / has errors." Often a correctable coding/submission error — resubmit corrected.' },
  '109': { reason: 'out_of_network', note: '"Not covered by this payer/contractor." Check network status and No Surprises Act protections.' },
  '119': { reason: 'not_covered', note: '"Benefit maximum reached." Verify the accumulator and any exceptions.' },
};
