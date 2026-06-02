// ═══════════════════════════════════════════════════════════════════════
// Application state — shared mutable globals
// ═══════════════════════════════════════════════════════════════════════

// Load cart — reset if old format (values were plain numbers, not objects)
const _savedCart    = JSON.parse(sessionStorage.getItem('pizza42_cart') || '{}');
const _isOldFormat  = Object.values(_savedCart).some(v => typeof v === 'number');
let cart            = _isOldFormat ? {} : _savedCart;

let currentUser     = null;   // Auth0 user profile object
let idTokenClaims   = null;   // ID token claims (including custom namespace claims)
let mfaVerified     = false;  // true after a successful Step-Up MFA redirect
