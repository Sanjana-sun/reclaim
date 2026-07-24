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
  '6': { reason: 'coding', note: '"Procedure/revenue code inconsistent with the patient\'s age." Usually a correctable coding error.' },
  '11': { reason: 'coding', note: '"Diagnosis inconsistent with the procedure." Correct the coding or document the linkage.' },
  '18': { reason: 'coding', note: '"Duplicate claim/service." If not truly a duplicate, show the distinct dates/units.' },
  '29': { reason: 'not_covered', note: '"Time limit for filing has expired." If the delay was the provider\'s/plan\'s fault, argue good cause.' },
  '45': { reason: 'coding', note: '"Charge exceeds fee schedule." Not your responsibility beyond contracted rates — for bill disputes.' },
  '97': { reason: 'coding', note: '"Bundled/included in another service." Challenge improper bundling (unbundling) where separately payable.' },
  '151': { reason: 'medical_necessity', note: '"Payment adjusted — information does not support this many services." Document medical necessity for the volume.' },
  '167': { reason: 'not_covered', note: '"Diagnosis not covered." Demand the exclusion and show the correct/covered diagnosis.' },
  '234': { reason: 'coding', note: '"Procedure not paid separately." Verify whether it should be separately reimbursable.' },
  'B7': { reason: 'out_of_network', note: '"Provider not certified/eligible." Check credentialing and network status; may implicate No Surprises Act.' },
};
