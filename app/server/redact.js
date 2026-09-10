// Minimum-necessary views of an appeal.
//
// Since the "Your details" step shipped, an appeal row carries the patient's name, address,
// member ID, claim number, phone and email, both in `details` and merged into the letter body.
// A clinician reviewing whether the medical-necessity framing is sound needs the clinical
// story and the argument. They do not need to know where the patient lives.
//
// So the reviewer gets the letter with identifiers swapped back out for placeholders, and no
// `details` object at all.

const LABELS = {
  name: '[Patient name]',
  address: '[Address]',
  memberId: '[Member ID]',
  claimNumber: '[Claim #]',
  phone: '[Phone]',
  email: '[Email]',
  accountNumber: '[Account #]',
};

function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Swap every non-empty detail value in `text` back to its placeholder.
function scrubText(text, details) {
  if (!text || !details) return text;
  let out = String(text);
  // Longest values first, so a full address is replaced before a name nested inside it.
  const entries = Object.entries(details)
    .filter(([k, v]) => LABELS[k] && typeof v === 'string' && v.trim().length >= 2)
    .sort((a, b) => String(b[1]).length - String(a[1]).length);
  for (const [key, value] of entries) {
    // Multi-line values (addresses) are matched literally; short ones on word boundaries so
    // a member ID like "A12" doesn't eat a substring of an unrelated word.
    const v = escapeRe(value.trim());
    const re = value.includes('\n') ? new RegExp(v, 'g') : new RegExp(`\\b${v}\\b`, 'gi');
    out = out.replace(re, LABELS[key]);
  }
  return out;
}

// What a clinical reviewer is allowed to see.
function clinicianView(appeal) {
  if (!appeal) return appeal;
  const { details, letter, external_letter, notes, ...rest } = appeal;
  return {
    ...rest,
    notes: scrubText(notes, details),
    letter: scrubText(letter, details),
    // Reviewers work from the internal appeal; the external-review letter is out of scope.
    redacted: true,
  };
}

module.exports = { clinicianView, scrubText, LABELS };
