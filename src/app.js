// ═══════════════════════════════════════════════════════════════════════════
//  app.js — Officer / Admin Dashboard Logic
// ═══════════════════════════════════════════════════════════════════════════

let web3;
let contract;
let currentAccount = null;
let currentRole = 0;   // 0=None, 1=Police, 2=Court
let isAdmin = false;
let selectedFile = null;

const ROLE_NAMES = ['None', 'Police', 'Court', 'Intermediary', 'Victim'];

// ── Initialization ────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  setupDragDrop();

  // Auto-connect if MetaMask was previously connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
  }

  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        onWalletConnected();
      } else {
        resetUI();
      }
    });

    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
  }
});

// ── Wallet Connection ─────────────────────────────────────────────────────

async function connectWallet() {
  if (!window.ethereum) {
    showToast('MetaMask not detected! Please install the MetaMask extension.', 'error');
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    web3 = new Web3(window.ethereum);
    currentAccount = accounts[0];

    contract = new web3.eth.Contract(CONFIG.CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);

    await onWalletConnected();
    showToast('Wallet connected successfully!', 'success');
  } catch (err) {
    console.error('Connection failed:', err);
    showToast('Failed to connect wallet: ' + err.message, 'error');
  }
}

async function onWalletConnected() {
  // Update UI with address
  const btn = document.getElementById('btnConnect');
  btn.classList.add('connected');
  btn.innerHTML = '<span>🔗</span><span class="btn-label">Connected</span>';

  const addrEl = document.getElementById('walletAddr');
  addrEl.textContent = truncateAddress(currentAccount);
  addrEl.classList.remove('hidden');

  // Get admin address
  const adminAddr = await contract.methods.admin().call();
  isAdmin = (currentAccount.toLowerCase() === adminAddr.toLowerCase());

  // Get role
  const role = await contract.methods.getMyRole().call({ from: currentAccount });
  currentRole = parseInt(role);

  updateRoleBadge();
  updatePanelVisibility();
  loadEvidences();
}

// ── Role Badge ────────────────────────────────────────────────────────────

function updateRoleBadge() {
  const badge = document.getElementById('roleBadge');
  badge.classList.remove('hidden', 'role-admin', 'role-police', 'role-court', 'role-none');

  if (isAdmin) {
    badge.textContent = '👑 Admin';
    badge.classList.add('role-admin');
  } else if (currentRole === 1) {
    badge.textContent = '🚔 Police';
    badge.classList.add('role-police');
  } else if (currentRole === 2) {
    badge.textContent = '⚖️ Court';
    badge.classList.add('role-court');
  } else {
    badge.textContent = '— No Role';
    badge.classList.add('role-none');
  }
}

function updatePanelVisibility() {
  const adminPanel = document.getElementById('adminPanel');
  const uploadPanel = document.getElementById('uploadPanel');

  // Admin panel: only if wallet is admin
  if (isAdmin) {
    adminPanel.classList.remove('hidden');
  } else {
    adminPanel.classList.add('hidden');
  }

  // Upload panel: only if role is Police (or admin for testing)
  if (currentRole === 1 || isAdmin) {
    uploadPanel.classList.remove('hidden');
  } else {
    uploadPanel.classList.add('hidden');
  }
}

// ── Admin: Role Management ────────────────────────────────────────────────

async function assignRole() {
  const address = document.getElementById('roleAddress').value.trim();
  const role = document.getElementById('roleSelect').value;
  const statusEl = document.getElementById('adminStatus');

  if (!web3.utils.isAddress(address)) {
    showStatus(statusEl, 'Please enter a valid Ethereum address.', 'error');
    return;
  }

  showStatus(statusEl, 'Assigning role — please confirm in MetaMask…', 'info');

  try {
    await contract.methods.assignRole(address, role).send({ from: currentAccount });
    const roleName = ROLE_NAMES[parseInt(role)];
    showStatus(statusEl, `✅ Successfully assigned ${roleName} role to ${truncateAddress(address)}`, 'success');
    showToast(`Role "${roleName}" assigned successfully!`, 'success');
    document.getElementById('roleAddress').value = '';
  } catch (err) {
    console.error('assignRole failed:', err);
    showStatus(statusEl, '❌ Failed: ' + (err.message || 'Transaction rejected'), 'error');
    showToast('Role assignment failed.', 'error');
  }
}

async function revokeRole() {
  const address = document.getElementById('roleAddress').value.trim();
  const statusEl = document.getElementById('adminStatus');

  if (!web3.utils.isAddress(address)) {
    showStatus(statusEl, 'Please enter a valid Ethereum address.', 'error');
    return;
  }

  showStatus(statusEl, 'Revoking role — please confirm in MetaMask…', 'info');

  try {
    await contract.methods.revokeRole(address).send({ from: currentAccount });
    showStatus(statusEl, `✅ Successfully revoked role from ${truncateAddress(address)}`, 'success');
    showToast('Role revoked successfully!', 'success');
    document.getElementById('roleAddress').value = '';
  } catch (err) {
    console.error('revokeRole failed:', err);
    showStatus(statusEl, '❌ Failed: ' + (err.message || 'Transaction rejected'), 'error');
    showToast('Role revocation failed.', 'error');
  }
}

// ── File Handling ─────────────────────────────────────────────────────────

function setupDragDrop() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      showSelectedFile();
    }
  });
}

function handleFileSelect(event) {
  selectedFile = event.target.files[0];
  showSelectedFile();
}

function showSelectedFile() {
  const nameEl = document.getElementById('fileName');
  if (selectedFile) {
    nameEl.textContent = `📎 ${selectedFile.name} (${formatBytes(selectedFile.size)})`;
    nameEl.classList.remove('hidden');
    document.getElementById('btnUpload').disabled = false;
  }
}

// ── Evidence Upload ───────────────────────────────────────────────────────

async function uploadEvidence() {
  const caseId = document.getElementById('caseId').value.trim();
  const description = document.getElementById('description').value.trim();
  const statusEl = document.getElementById('uploadStatus');
  const progressEl = document.getElementById('uploadProgress');

  // Validation
  if (!caseId || !description || !selectedFile) {
    showToast('Please fill in all fields and select a file.', 'error');
    return;
  }

  if (!currentAccount) {
    showToast('Please connect your wallet first.', 'error');
    return;
  }

  // Show progress
  progressEl.classList.remove('hidden');
  resetProgressSteps();

  const btnUpload = document.getElementById('btnUpload');
  btnUpload.disabled = true;

  try {
    // Step 1: Hash the file
    setStepState('step1', 'active');
    const fileHash = await computeSHA256(selectedFile);
    setStepState('step1', 'done');

    // Step 2: Upload to IPFS via Pinata
    setStepState('step2', 'active');
    const cid = await uploadToPinata(selectedFile);
    setStepState('step2', 'done');

    // Step 3: Write to blockchain
    setStepState('step3', 'active');
    await contract.methods.addEvidence(
      parseInt(caseId),
      cid,
      fileHash,
      description,
      255 // aiFakeScore: 255 = not checked (AI check only runs in the React app)
    ).send({ from: currentAccount });
    setStepState('step3', 'done');

    // Step 4: Done
    setStepState('step4', 'done');

    showStatus(statusEl, `✅ Evidence stored! CID: ${cid}`, 'success');
    showToast('Evidence uploaded and recorded on blockchain!', 'success');

    // Reset form
    document.getElementById('caseId').value = '';
    document.getElementById('description').value = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').classList.add('hidden');
    selectedFile = null;

    // Reload table
    loadEvidences();
  } catch (err) {
    console.error('Upload failed:', err);
    // Mark current active step as error
    ['step1', 'step2', 'step3', 'step4'].forEach(id => {
      const el = document.getElementById(id);
      if (el.classList.contains('active')) {
        setStepState(id, 'error');
      }
    });
    showStatus(statusEl, '❌ Upload failed: ' + (err.message || 'Unknown error'), 'error');
    showToast('Evidence upload failed.', 'error');
  } finally {
    btnUpload.disabled = false;
  }
}

// ── SHA-256 Hashing ───────────────────────────────────────────────────────

function computeSHA256(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Pinata IPFS Upload ────────────────────────────────────────────────────

async function uploadToPinata(file) {
  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      source: 'evidence-management-system'
    }
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 1
  });
  formData.append('pinataOptions', options);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': CONFIG.PINATA_API_KEY,
      'pinata_secret_api_key': CONFIG.PINATA_SECRET_API_KEY
    },
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Pinata upload failed: ' + errText);
  }

  const result = await response.json();
  return result.IpfsHash;
}

// ── Status Labels ─────────────────────────────────────────────────────────

const STATUS_LABELS = ['Open', 'Under Review', 'Closed'];
const STATUS_CLASSES = ['status-open', 'status-review', 'status-closed'];

// ── Load Evidence Records ─────────────────────────────────────────────────

async function loadEvidences() {
  if (!contract) return;

  const tbody = document.getElementById('evidenceTableBody');
  tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:1rem;">Loading records…</p></div></td></tr>';

  try {
    const count = await contract.methods.getEvidenceCount().call();
    const total = parseInt(count);

    if (total === 0) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📭</div><p>No evidence records found</p></div></td></tr>';
      return;
    }

    let rows = '';
    for (let i = 0; i < total; i++) {
      const ev = await contract.methods.getEvidence(i).call();
      const date = new Date(parseInt(ev.timestamp) * 1000);
      const statusIdx = parseInt(ev.status);
      const statusLabel = STATUS_LABELS[statusIdx] || 'Open';
      const statusClass = STATUS_CLASSES[statusIdx] || 'status-open';

      rows += `
        <tr>
          <td><strong>${i}</strong></td>
          <td>${ev.caseId}</td>
          <td>${escapeHtml(ev.description)}</td>
          <td class="cell-truncate">
            <a href="https://gateway.pinata.cloud/ipfs/${ev.cid}" target="_blank" class="cid-link" title="${ev.cid}">
              ${truncateCID(ev.cid)}
            </a>
          </td>
          <td class="cell-mono cell-truncate" title="${ev.uploadedBy}">${truncateAddress(ev.uploadedBy)}</td>
          <td style="white-space:nowrap;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>
            <a href="https://gateway.pinata.cloud/ipfs/${ev.cid}" target="_blank" class="btn btn-secondary btn-sm btn-download" title="Download from IPFS">
              ⬇ Download
            </a>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = rows;
  } catch (err) {
    console.error('Failed to load evidences:', err);
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load records</p></div></td></tr>';
  }
}

// ── Progress Steps ────────────────────────────────────────────────────────

function resetProgressSteps() {
  ['step1', 'step2', 'step3', 'step4'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'progress-step';
    el.querySelector('.step-icon').className = 'step-icon pending';
  });
}

function setStepState(stepId, state) {
  const el = document.getElementById(stepId);
  el.className = 'progress-step ' + state;
  const icon = el.querySelector('.step-icon');
  icon.className = 'step-icon';

  if (state === 'done') {
    icon.textContent = '✓';
  } else if (state === 'error') {
    icon.textContent = '✕';
  } else if (state === 'active') {
    icon.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';
  }
}

// ── Status Bar ────────────────────────────────────────────────────────────

function showStatus(el, message, type) {
  el.className = 'status-bar active ' + type;
  el.innerHTML = type === 'info'
    ? `<div class="spinner"></div><span>${message}</span>`
    : `<span>${message}</span>`;
}

// ── Toast Notifications ───────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Utility Functions ─────────────────────────────────────────────────────

function truncateAddress(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function truncateCID(cid) {
  if (!cid) return '—';
  if (cid.length <= 20) return cid;
  return cid.slice(0, 10) + '…' + cid.slice(-6);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function resetUI() {
  currentAccount = null;
  currentRole = 0;
  isAdmin = false;

  document.getElementById('btnConnect').classList.remove('connected');
  document.getElementById('btnConnect').innerHTML = '<span>🦊</span><span class="btn-label">Connect Wallet</span>';
  document.getElementById('walletAddr').classList.add('hidden');
  document.getElementById('roleBadge').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('uploadPanel').classList.add('hidden');
}
