// ═══════════════════════════════════════════════════════════════════════════
//  court.js — Court Verification Dashboard Logic
// ═══════════════════════════════════════════════════════════════════════════

let web3;
let contract;
let currentAccount = null;
let currentRole = 0;
let isAdmin = false;

const ROLE_NAMES = ['None', 'Police', 'Court', 'Intermediary', 'Victim'];

// Track verification status per evidence ID
const verificationStatus = {};

// ── Initialization ────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
  }

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

// ── Status Labels ─────────────────────────────────────────────────────────

const STATUS_LABELS = ['Open', 'Under Review', 'Closed'];
const STATUS_CLASSES = ['status-open', 'status-review', 'status-closed'];

// ── Load Evidence Records ─────────────────────────────────────────────────

async function loadEvidences() {
  if (!contract) return;

  const tbody = document.getElementById('evidenceTableBody');
  tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="spinner" style="margin:0 auto;"></div><p style="margin-top:1rem;">Loading records…</p></div></td></tr>';

  try {
    const count = await contract.methods.getEvidenceCount().call();
    const total = parseInt(count);

    if (total === 0) {
      tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📭</div><p>No evidence records found</p></div></td></tr>';
      return;
    }

    let rows = '';
    for (let i = 0; i < total; i++) {
      const ev = await contract.methods.getEvidence(i).call();
      const date = new Date(parseInt(ev.timestamp) * 1000);
      const statusIdx = parseInt(ev.status);
      const statusLabel = STATUS_LABELS[statusIdx] || 'Open';
      const statusClass = STATUS_CLASSES[statusIdx] || 'status-open';

      // Check if we have a cached verification result
      let integrityCol = '<span style="color:var(--gray-400);font-size:0.82rem;">—</span>';
      if (verificationStatus[i] === 'verified') {
        integrityCol = '<span class="verify-badge verified">✅ Verified — Not Tampered</span>';
      } else if (verificationStatus[i] === 'tampered') {
        integrityCol = '<span class="verify-badge tampered">⚠️ Mismatch Detected</span>';
      } else if (verificationStatus[i] === 'verifying') {
        integrityCol = '<span class="verify-badge verifying"><div class="spinner" style="width:12px;height:12px;border-width:2px;"></div> Verifying…</span>';
      } else if (verificationStatus[i] === 'error') {
        integrityCol = '<span class="verify-badge tampered">❌ Fetch Error</span>';
      }

      rows += `
        <tr id="row-${i}">
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
          <td id="integrity-${i}">${integrityCol}</td>
          <td>
            <div class="status-update-group">
              <select id="statusSelect-${i}" class="form-control form-control-sm">
                <option value="0" ${statusIdx === 0 ? 'selected' : ''}>Open</option>
                <option value="1" ${statusIdx === 1 ? 'selected' : ''}>Under Review</option>
                <option value="2" ${statusIdx === 2 ? 'selected' : ''}>Closed</option>
              </select>
              <button class="btn btn-primary btn-sm" onclick="updateStatus(${i})" title="Update case status">
                📝 Update
              </button>
            </div>
          </td>
          <td>
            <div class="btn-group-vertical">
              <button class="btn btn-primary btn-sm" onclick="verifyEvidence(${i}, '${ev.cid}', '${ev.fileHash}')"
                ${verificationStatus[i] === 'verifying' ? 'disabled' : ''}>
                🔍 Verify
              </button>
              <a href="https://gateway.pinata.cloud/ipfs/${ev.cid}" target="_blank" class="btn btn-secondary btn-sm btn-download" title="Download from IPFS">
                ⬇ Download
              </a>
            </div>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = rows;
  } catch (err) {
    console.error('Failed to load evidences:', err);
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load records</p></div></td></tr>';
  }
}

// ── Update Evidence Status ────────────────────────────────────────────────

async function updateStatus(evidenceId) {
  if (!contract || !currentAccount) {
    showToast('Please connect your wallet first.', 'error');
    return;
  }

  const selectEl = document.getElementById(`statusSelect-${evidenceId}`);
  const newStatus = parseInt(selectEl.value);

  try {
    showToast(`Updating status for evidence #${evidenceId} — please confirm in MetaMask…`, 'info');
    await contract.methods.updateStatus(evidenceId, newStatus).send({ from: currentAccount });
    showToast(`✅ Status updated to "${STATUS_LABELS[newStatus]}" for evidence #${evidenceId}`, 'success');
    loadEvidences();
  } catch (err) {
    console.error('updateStatus failed:', err);
    showToast('❌ Failed to update status: ' + (err.message || 'Transaction rejected'), 'error');
  }
}

// ── Verify Evidence ───────────────────────────────────────────────────────

async function verifyEvidence(id, cid, storedHash) {
  const integrityCell = document.getElementById(`integrity-${id}`);

  // Set verifying state
  verificationStatus[id] = 'verifying';
  integrityCell.innerHTML = '<span class="verify-badge verifying"><div class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;"></div> Verifying…</span>';

  try {
    // Fetch file from IPFS gateway
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(gatewayUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch file from IPFS`);
    }

    const fileBuffer = await response.arrayBuffer();

    // Compute SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const recomputedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare
    if (recomputedHash === storedHash) {
      verificationStatus[id] = 'verified';
      integrityCell.innerHTML = '<span class="verify-badge verified">✅ Verified — Not Tampered</span>';
      showToast(`Evidence #${id}: Integrity verified ✓`, 'success');
    } else {
      verificationStatus[id] = 'tampered';
      integrityCell.innerHTML = '<span class="verify-badge tampered">⚠️ Mismatch Detected</span>';
      showToast(`Evidence #${id}: Hash mismatch detected!`, 'error');
      console.warn(`Hash mismatch for evidence #${id}:`);
      console.warn(`  Stored:     ${storedHash}`);
      console.warn(`  Recomputed: ${recomputedHash}`);
    }
  } catch (err) {
    console.error(`Verification failed for evidence #${id}:`, err);
    verificationStatus[id] = 'error';
    integrityCell.innerHTML = '<span class="verify-badge tampered">❌ Verification Error</span>';
    showToast(`Evidence #${id}: Verification failed — ${err.message}`, 'error');
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
}
