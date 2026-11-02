let catalogDemo = [];
let catalogCustom = [];
let registeredVendors = [];
let currentVendorUser = null;
let currentCommitment = "";
let currentSignature = "";

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (tab === 'vendor') {
    document.querySelector('.tabs button:nth-child(1)').classList.add('active');
    document.getElementById('vendor-tab').classList.add('active');
  } else if (tab === 'verifier') {
    document.querySelector('.tabs button:nth-child(2)').classList.add('active');
    document.getElementById('verifier-tab').classList.add('active');
    loadRegistryDropdown();
  } else {
    document.querySelector('.tabs button:nth-child(3)').classList.add('active');
    document.getElementById('explain-tab').classList.add('active');
  }
}

// Fetch users from users.json and display 1-click vendor login buttons
async function fetchVendors() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();

    registeredVendors = data.vendors || [];

    const container = document.getElementById('quick-vendor-buttons');
    if (!container) return;

    container.innerHTML = '';

    registeredVendors.forEach(v => {
      const div = document.createElement('div');
      div.className = 'demo-account-pill';

      div.innerHTML = `<strong>${v.vendor_name}</strong><br><span style="color:#64748b;">${v.role}</span><br><code style="color:#2563eb;">User: ${v.username}</code>`;

      div.onclick = () => directVendorLogin(v.username, v.password);
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error fetching vendors:", err);
  }
}

async function directVendorLogin(username, password) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.status === 'success') {
      currentVendorUser = data;
      updateAuthUI();
    } else {
      alert("Login failed: " + data.message);
    }
  } catch (err) {
    console.error("Login error:", err);
  }
}

function submitVendorLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();

  if (!u || !p) {
    alert("Please enter both username and password.");
    return;
  }

  directVendorLogin(u, p);
}

function focusVendorLogin() {
  switchTab('vendor');

  const userField = document.getElementById('login-username');
  if (userField) userField.focus();
}

function logoutVendor() {
  currentVendorUser = null;
  updateAuthUI();
  clearAllInputsOnReload();
}

function updateAuthUI() {
  const badge = document.getElementById('session-badge');
  const details = document.getElementById('session-details');
  const actionBtn = document.getElementById('auth-action-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginGate = document.getElementById('vendor-login-gate');
  const workspace = document.getElementById('vendor-workspace');

  if (currentVendorUser) {
    badge.className = 'user-badge logged-in';
    badge.innerText = `Logged in: ${currentVendorUser.vendor_name}`;
    details.innerText = `(${currentVendorUser.role})`;
    actionBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';

    if (loginGate) loginGate.style.display = 'none';
    if (workspace) workspace.style.display = 'block';
  } else {
    badge.className = 'user-badge';
    badge.innerText = 'Access Locked • Please Login';
    details.innerText = '';
    actionBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';

    if (loginGate) loginGate.style.display = 'block';
    if (workspace) workspace.style.display = 'none';
  }
}

// Clear all inputs on reload
function clearAllInputsOnReload() {
  document.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], textarea').forEach(el => {
    if (el.id !== 'v-r') {
      el.value = '';
    }
  });

  const cRes = document.getElementById('v-commitment-result');
  if (cRes) cRes.innerText = 'Commitment C: [Not Generated Yet]';

  const sRes = document.getElementById('v-signature-result');
  if (sRes) sRes.innerText = 'Signature (Hex): [None]';

  const vCard = document.getElementById('verdict-card');
  if (vCard) vCard.style.display = 'none';
}

// Fetch Demo Cores
async function fetchDemoSignatures() {
  try {
    const res = await fetch('/api/signatures');
    const data = await res.json();

    catalogDemo = data.demo_ip_cores || [];

    const sel = document.getElementById('v-demo-select');
    if (!sel) return;

    sel.innerHTML = '<option value="">-- Choose Demo Core or Keep Blank for Custom Chip --</option>';

    catalogDemo.forEach((item, idx) => {
      sel.innerHTML += `<option value="${idx}">${item.id} - ${item.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading demo signatures:", err);
  }
}

function loadVendorSelectedIP() {
  const selIdx = document.getElementById('v-demo-select').value;
  const tsPreview = document.getElementById('v-timestamp-preview');

  if (selIdx === "") {
    document.getElementById('v-ip-id').value = "";
    document.getElementById('v-ip-name').value = "";
    document.getElementById('v-bitstream').value = "";
    document.getElementById('v-hash').value = "";
    document.getElementById('v-puk').value = "";
    document.getElementById('v-prk').value = "";

    document.getElementById('v-commitment-result').innerText = 'Commitment C: [Not Generated Yet]';
    document.getElementById('v-signature-result').innerText = 'Signature (Hex): [None]';

    tsPreview.style.display = 'none';
    currentCommitment = "";
    currentSignature = "";
    return;
  }

  const item = catalogDemo[selIdx];

  document.getElementById('v-ip-id').value = item.id;
  document.getElementById('v-ip-name').value = item.name;
  document.getElementById('v-bitstream').value = item.watermark_bitstream;
  document.getElementById('v-hash').value = item.design_hash;
  document.getElementById('v-puk').value = item.public_key || "";
  document.getElementById('v-prk').value = "[Pre-signed in signatures.json; Private key archived safely]";

  currentCommitment = item.commitment_C || "";
  currentSignature = item.signature_hex || "";

  document.getElementById('v-commitment-result').innerText =
    `Commitment C: ${item.commitment_C} (Formula: C = G*h + r*H, r: ${item.blinding_factor_r})`;

  document.getElementById('v-signature-result').innerText =
    `Signature (Hex): ${item.signature_hex}`;

  if (item.registered_at) {
    tsPreview.style.display = 'inline-flex';
    tsPreview.innerText = `Registered: ${item.registered_at} by ${item.registered_by || 'Demo Registry'}`;
  } else {
    tsPreview.style.display = 'none';
  }
}

// Generate RSA-2048 Keypair
async function generateKeys() {
  const res = await fetch('/api/generate-keys', { method: 'POST' });
  const data = await res.json();

  if (data.status === 'success') {
    document.getElementById('v-prk').value = data.private_key;
    document.getElementById('v-puk').value = data.public_key;
  }
}

// Generate Pedersen Commitment using C = G*h + r*H mod P
async function createCommitment() {
  const bitstream = document.getElementById('v-bitstream').value.trim();
  const r = document.getElementById('v-r').value.trim();

  if (!bitstream) {
    alert("Please enter or select a watermark bitstream first.");
    return;
  }

  const res = await fetch('/api/pedersen-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bitstream: bitstream, blinding_factor: r })
  });

  const data = await res.json();

  if (data.status === 'success') {
    currentCommitment = data.commitment_C;

    document.getElementById('v-commitment-result').innerText =
      `Commitment C: ${data.commitment_C} (Formula: C = G*h + r*H, h: ${data.watermark_h}, r: ${data.blinding_r})`;
  }
}

// Digitally Sign Netlist Hash + Watermark with PrK
async function signWatermark() {
  const prk = document.getElementById('v-prk').value.trim();
  const bitstream = document.getElementById('v-bitstream').value.trim();
  const hash = document.getElementById('v-hash').value.trim();

  if (!prk || prk.startsWith('[')) {
    alert("Generate a fresh Private Key (PrK) or paste a valid PEM private key first.");
    return;
  }

  if (!bitstream || !hash) {
    alert("Watermark bitstream and netlist hash are required before signing.");
    return;
  }

  const content = `${bitstream}:${hash}`;

  const res = await fetch('/api/sign-watermark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ private_key: prk, content: content })
  });

  const data = await res.json();

  if (data.status === 'success') {
    currentSignature = data.signature_hex;
    document.getElementById('v-signature-result').innerText =
      `Signature (Hex): ${data.signature_hex}`;
  } else {
    alert("Signing failed: " + data.message);
  }
}

// Publish Custom Chip to Local Database with Timestamp
async function publishIPToDatabase() {
  const ipId = document.getElementById('v-ip-id').value.trim() ||
    ("CUSTOM-IP-" + Math.floor(Math.random() * 10000));

  const name = document.getElementById('v-ip-name').value.trim() ||
    "Custom Synthesized Hardware Core";

  const bitstream = document.getElementById('v-bitstream').value.trim();
  const hash = document.getElementById('v-hash').value.trim();
  const puk = document.getElementById('v-puk').value.trim();
  const r = document.getElementById('v-r').value.trim();

  if (!bitstream || !hash) {
    alert("Please provide at least a watermark bitstream and design hash.");
    return;
  }

  const registeredBy = currentVendorUser
    ? `${currentVendorUser.vendor_name} (${currentVendorUser.username})`
    : "Verified Hardware Vendor";

  const payload = {
    ip_id: ipId,
    name: name,
    watermark_bitstream: bitstream,
    public_key: puk,
    commitment_C: currentCommitment,
    blinding_factor_r: r,
    signature_hex: currentSignature,
    design_hash: hash,
    test_vector: "1010111100001010",
    is_custom: true,
    registered_by: registeredBy
  };

  const res = await fetch('/api/publish-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.status === 'success') {
    const status = document.getElementById('v-publish-status');
    status.style.color = '#10b981';
    status.innerText = `✓ Saved to database.json at [${data.timestamp}]!`;

    setTimeout(() => {
      status.innerText = "";
    }, 5000);
  }
}

// Load Dropdown in Verifier Portal with Timestamps
async function loadRegistryDropdown() {
  try {
    const res = await fetch('/api/registry');
    const data = await res.json();

    catalogDemo = data.demo_cores || [];
    catalogCustom = data.custom_cores || [];

    const sel = document.getElementById('ver-registered-select');
    sel.innerHTML = '<option value="">-- Choose from Local Database / Built-in --</option>';

    if (catalogCustom.length > 0) {
      sel.innerHTML += `<optgroup label="Saved in Local Machine Database (database.json)">`;

      catalogCustom.forEach((item, idx) => {
        const timeLabel = item.registered_at ? ` [${item.registered_at}]` : '';
        sel.innerHTML += `<option value="custom_${idx}">[Local DB] ${item.ip_id} - ${item.name}${timeLabel}</option>`;
      });

      sel.innerHTML += `</optgroup>`;
    }

    if (catalogDemo.length > 0) {
      sel.innerHTML += `<optgroup label="Predefined Demo Cores (Built-in signatures.json)">`;

      catalogDemo.forEach((item, idx) => {
        const timeLabel = item.registered_at ? ` [${item.registered_at}]` : '';
        sel.innerHTML += `<option value="demo_${idx}">[Demo] ${item.id} - ${item.name}${timeLabel}</option>`;
      });

      sel.innerHTML += `</optgroup>`;
    }
  } catch (err) {
    console.error("Failed to fetch registry:", err);
  }
}

// Only auto-load registered PUBLIC reference records.
// Do not auto-fill suspected bitstream or revealed blinding factor r.
function loadVerifierRegisteredItem() {
  const val = document.getElementById('ver-registered-select').value;

  const tsBadge = document.getElementById('ver-timestamp-badge');
  const auditMeta = document.getElementById('ver-audit-metadata');

  if (!val) {
    tsBadge.style.display = 'none';
    auditMeta.style.display = 'none';
    return;
  }

  const [type, idxStr] = val.split('_');
  const idx = parseInt(idxStr);

  const item = (type === 'custom') ? catalogCustom[idx] : catalogDemo[idx];

  // Auto-fill Registered Public Registry Records
  document.getElementById('ver-puk').value = item.public_key || "";
  document.getElementById('ver-sig').value = item.signature_hex || "";
  document.getElementById('ver-hash').value = item.design_hash || "";
  document.getElementById('ver-c').value = item.commitment_C || "";

  // Keep suspected bitstream and revealed blinding factor blank for manual auditor input.
  document.getElementById('ver-bitstream').value = "";
  document.getElementById('ver-r').value = "";

  if (item.registered_at) {
    tsBadge.style.display = 'inline-flex';
    tsBadge.innerText = `Certified Timestamp: ${item.registered_at}`;

    auditMeta.style.display = 'block';
    auditMeta.innerHTML =
      `<strong>Registry Ledger Record:</strong> ID: <code>${item.ip_id || item.id}</code> | Registered by: <strong>${item.registered_by || 'Verified Hardware Vendor'}</strong> | Timestamp: <strong>${item.registered_at}</strong>`;
  } else {
    tsBadge.style.display = 'none';
    auditMeta.style.display = 'none';
  }
}

function clearVerificationFields() {
  document.getElementById('ver-bitstream').value = "";
  document.getElementById('ver-puk').value = "";
  document.getElementById('ver-sig').value = "";
  document.getElementById('ver-hash').value = "";
  document.getElementById('ver-c').value = "";
  document.getElementById('ver-r').value = "";
  document.getElementById('ver-registered-select').value = "";

  document.getElementById('ver-timestamp-badge').style.display = 'none';
  document.getElementById('ver-audit-metadata').style.display = 'none';
  document.getElementById('verdict-card').style.display = 'none';
}

function checkAnotherDesign() {
  clearVerificationFields();

  const formCard = document.getElementById('verification-form-card');
  formCard.scrollIntoView({ behavior: 'smooth' });
}

// Run Full Verification
async function runCompleteVerification() {
  const bitstream = document.getElementById('ver-bitstream').value.trim();
  const puk = document.getElementById('ver-puk').value.trim();
  const sig = document.getElementById('ver-sig').value.trim();
  const hash = document.getElementById('ver-hash').value.trim();
  const c = document.getElementById('ver-c').value.trim();
  const r = document.getElementById('ver-r').value.trim();

  if (!bitstream) {
    alert("Please manually enter the Suspected Design Watermark Bitstream extracted from the chip.");
    return;
  }

  if (!puk || !sig || !hash) {
    alert("Please select a registered design or provide public key, signature, and netlist hash.");
    return;
  }

  // 1. Verify Asymmetric Digital Signature
  const content = `${bitstream}:${hash}`;

  const sigRes = await fetch('/api/verify-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public_key: puk,
      content: content,
      signature_hex: sig
    })
  });

  const sigData = await sigRes.json();

  // 2. Verify Pedersen Commitment (C = G * h + r * H mod P)
  let commitMatch = false;
  let commitEvaluated = false;

  if (c && r) {
    commitEvaluated = true;

    const cRes = await fetch('/api/verify-commitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bitstream: bitstream,
        blinding_factor: r,
        commitment_C: c
      })
    });

    const cData = await cRes.json();
    commitMatch = cData.match;
  }

  const card = document.getElementById('verdict-card');
  const details = document.getElementById('verdict-details');
  const verdictBox = document.getElementById('verdict-box');
  const verdictWord = document.getElementById('verdict-word');
  const verdictExplanation = document.getElementById('verdict-explanation');

  card.style.display = 'block';

  let html =
    `<strong>1. Digital Signature Check (Public Key PuK):</strong> ${
      sigData.valid
        ? '<span style="color:green;">VALID (Vendor Signature Authenticated)</span>'
        : '<span style="color:red;">INVALID (Signature Mismatch)</span>'
    }<br>`;

  if (commitEvaluated) {
    html +=
      `<strong>2. Pedersen Commitment Check (C = G*h + r*H):</strong> ${
        commitMatch
          ? '<span style="color:green;">MATCH CONFIRMED (Fixed Prior to Dispute)</span>'
          : '<span style="color:red;">MISMATCH (Invalid Blinding or Watermark)</span>'
      }<br>`;
  } else {
    html +=
      `<strong>2. Pedersen Commitment Check:</strong> <span style="color:#d97706;">SKIPPED (Please enter revealed blinding factor r to evaluate commitment)</span><br>`;
  }

  html += `<strong>3. Netlist Payload Evaluated:</strong> <code>${content}</code><br>`;

  const auditMetaEl = document.getElementById('ver-audit-metadata');

  if (auditMetaEl && auditMetaEl.innerText) {
    html += `<strong>4. Ledger Timestamp:</strong> <span style="color:#0369a1;">${auditMetaEl.innerText}</span><br>`;
  }

  details.innerHTML = html;

  // Corrected final verdict logic:
  // Failed checks do not prove that a design is genuine.
  if (!commitEvaluated) {
    verdictBox.className = 'verdict-box verdict-modified';
    verdictWord.innerText = "FINAL VERDICT: INCOMPLETE VERIFICATION";
    verdictExplanation.innerText =
      "Pedersen commitment verification was skipped. Enter the blinding factor r to complete verification.";

  } else if (sigData.valid && commitMatch) {
    verdictBox.className = 'verdict-box verdict-pirated';
    verdictWord.innerText = "FINAL VERDICT: REGISTERED EVIDENCE MATCHED";
    verdictExplanation.innerText =
      "Both the RSA signature and Pedersen commitment match the registered evidence. This alone does not prove unauthorized use or piracy.";

  } else if (!sigData.valid && commitMatch) {
    verdictBox.className = 'verdict-box verdict-modified';
    verdictWord.innerText = "FINAL VERDICT: SIGNATURE MISMATCH";
    verdictExplanation.innerText =
      "The Pedersen commitment matches, but the RSA signature does not match the registered signed content.";

  } else if (sigData.valid && !commitMatch) {
    verdictBox.className = 'verdict-box verdict-modified';
    verdictWord.innerText = "FINAL VERDICT: COMMITMENT MISMATCH";
    verdictExplanation.innerText =
      "The RSA signature matches, but the Pedersen commitment does not match the registered evidence.";

  } else {
    verdictBox.className = 'verdict-box verdict-modified';
    verdictWord.innerText = "FINAL VERDICT: INCONCLUSIVE";
    verdictExplanation.innerText =
      "Neither verification check matches. This does not prove that the design is genuine or clean.";
  }

  card.scrollIntoView({ behavior: 'smooth' });
}

window.onload = () => {
  clearAllInputsOnReload();
  fetchVendors();
  fetchDemoSignatures();
  loadRegistryDropdown();
  updateAuthUI();
};
