const fs = require('fs');
const path = require('path');
const { generateVisionJSON } = require('./geminiService');

const REF_FILE_PATH = path.join(__dirname, '../../reference_card.json');

let referenceImage = null;

// Load persisted reference image if available
try {
  if (fs.existsSync(REF_FILE_PATH)) {
    const raw = fs.readFileSync(REF_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data && parsed.mimeType) {
      referenceImage = parsed;
      console.log('[verificationService] Loaded reference ID card from disk');
    }
  }
} catch (err) {
  console.warn('[verificationService] Could not load saved reference ID card:', err.message);
}

function setReference(data, mimeType) {
  referenceImage = { data, mimeType };
  try {
    fs.writeFileSync(REF_FILE_PATH, JSON.stringify(referenceImage), 'utf8');
    console.log('[verificationService] Saved reference ID card to disk');
  } catch (err) {
    console.error('[verificationService] Could not persist reference card:', err.message);
  }
}

function hasReference() {
  return true;
}

function hasCustomReference() {
  return !!referenceImage;
}

function clearReference() {
  referenceImage = null;
  try {
    if (fs.existsSync(REF_FILE_PATH)) {
      fs.unlinkSync(REF_FILE_PATH);
    }
  } catch (err) {
    console.error('[verificationService] Could not clear reference file:', err.message);
  }
}

/**
 * Verifies submitted ID card against institutional reference and NIET card specification.
 *
 * Known NIET ID Card Structure:
 * - Header: Red top banner with NIET logo on left + "NOIDA INSTITUTE OF ENGG. & TECHNOLOGY, GR. NOIDA", affiliated to AKTU
 * - Title: "STUDENT'S ID CARD" or "EMPLOYEE ID CARD" in red text
 * - Photo: Centered framed cardholder photo
 * - Fields: Name, Roll/Adm.No., Course/Branch, Batch, Father's Name
 * - Footer: Horizontal barcode with ID number, Director's Sign, red bottom banner
 */
async function verifyIdCard(data, mimeType, employeeName = '') {
  let prompt;
  let images;

  if (referenceImage) {
    prompt = `You are an expert institutional ID card verifier for INQUEST enterprise system.

You have two images:
Image 1: Reference ID card template (NIET / Institutional standard).
Image 2: User-submitted ID card${employeeName ? ` (claimed cardholder name: "${employeeName}")` : ''}.

Standard NIET ID Card Features:
- Red top banner with NIET logo, "NOIDA INSTITUTE OF ENGG. & TECHNOLOGY", and AKTU affiliation text.
- Title "STUDENT'S ID CARD" or "EMPLOYEE ID CARD" in red.
- Centered portrait photograph.
- Key-value fields: Name, Roll/Adm.No., Course/Branch, Batch, Father's Name.
- Barcode near the bottom with printed code, Director's signature, and red footer bar.

Task:
1. Verify if Image 2 is a genuine physical/digital institutional ID card (NOT a personal selfie, portrait snapshot, random image, or unrelated object).
2. Compare format, layout, and branding against Image 1 and NIET standard.
3. Check if cardholder name is legible and reasonably matches "${employeeName || 'the cardholder'}".

Return ONLY a valid JSON object with:
{
  "verified": true or false,
  "confidence": <number 0-100>,
  "reason": "<1-2 sentence evaluation>",
  "details": {
    "institutionDetected": "<e.g. NIET / other>",
    "cardholderName": "<name read from card or null>",
    "idNumber": "<roll/admission/emp number or null>",
    "branch": "<course/branch if visible or null>"
  }
}`;
    images = [referenceImage, { data, mimeType }];
  } else {
    prompt = `You are an expert institutional ID card verifier for INQUEST enterprise system.

You are given an image of an ID card submitted by a user${employeeName ? ` (claimed cardholder name: "${employeeName}")` : ''}.

Standard NIET / Institutional ID Card Specification:
- Red top banner with NIET logo, "NOIDA INSTITUTE OF ENGG. & TECHNOLOGY, GR. NOIDA", affiliated to AKTU.
- Title "STUDENT'S ID CARD" or "EMPLOYEE ID CARD" in red below the header.
- Centered cardholder photograph in dark frame.
- Structured fields: Name, Roll/Adm.No., Course/Branch, Batch, Father's Name.
- Horizontal barcode with roll/ID number, Director's signature, and red footer line.

Verification Rules:
1. ACCEPT: Genuine NIET ID cards, institutional student/employee identity cards with photo, branding, and ID number.
2. If claimed name is provided ("${employeeName}"), verify that the name printed on the card matches or corresponds to it (allow case and slight spacing differences).
3. STRICTLY REJECT: personal selfies, front-camera headshots without a badge, animal pictures, screenshots of apps/chats, or unrelated graphics.

Return ONLY a valid JSON object with:
{
  "verified": true or false,
  "confidence": <number 0-100>,
  "reason": "<1-2 sentence evaluation>",
  "details": {
    "institutionDetected": "<e.g. NIET / other>",
    "cardholderName": "<name read from card or null>",
    "idNumber": "<roll/admission/emp number or null>",
    "branch": "<course/branch if visible or null>"
  }
}`;
    images = [{ data, mimeType }];
  }

  try {
    const result = await generateVisionJSON(prompt, images);
    return {
      verified: !!result.verified,
      confidence: typeof result.confidence === 'number' ? Math.round(result.confidence) : 85,
      reason: result.reason || (result.verified ? 'Institutional ID card verified successfully.' : 'ID card verification failed.'),
      details: result.details || null,
    };
  } catch (err) {
    console.error('[verificationService] verification AI error:', err.message);
    return {
      verified: false,
      confidence: 0,
      reason: err.message?.includes('timed out')
        ? 'Verification request timed out. Please try again.'
        : 'Verification service error. Please ensure the card is well-lit and legible.',
    };
  }
}

module.exports = {
  setReference,
  hasReference,
  hasCustomReference,
  clearReference,
  verifyIdCard,
};
