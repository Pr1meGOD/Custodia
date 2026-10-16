import { createContext, useContext, useState, useCallback, useEffect } from "react";
import Web3 from "web3";
import CONFIG from "../config.js";

const CustodiaContext = createContext(null);

const ROLE_NAMES = ["None", "Police", "Court", "Intermediary", "Victim"];
const STATUS_LABELS = ["Open", "Under Review", "Closed"];
const REVIEW_LABELS = ["Pending", "Approved", "Rejected"];

/** On-chain sentinel for "AI check not performed / not applicable" */
export const AI_SCORE_NOT_CHECKED = 255;
const DEEPFAKE_API_URL = CONFIG.DEEPFAKE_API_URL || "http://localhost:4000/api/check-deepfake";

/** Only images and videos are sent to the deepfake detector */
export const isMediaFile = (file) =>
  !!file && (file.type?.startsWith("image/") || file.type?.startsWith("video/"));

export function CustodiaProvider({ children }) {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [address, setAddress] = useState(null);
  const [role, setRole] = useState("None");       // "None" | "Admin" | "Police" | "Court" | "Intermediary" | "Victim"
  const [isAdmin, setIsAdmin] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected! Please install the MetaMask extension.");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const w3 = new Web3(window.ethereum);
    const c = new w3.eth.Contract(CONFIG.CONTRACT_ABI, CONFIG.CONTRACT_ADDRESS);
    setWeb3(w3);
    setContract(c);
    setAddress(accounts[0]);
    // Determine role
    const adminAddr = await c.methods.admin().call();
    const userIsAdmin = accounts[0].toLowerCase() === adminAddr.toLowerCase();
    setIsAdmin(userIsAdmin);
    const r = await c.methods.getMyRole().call({ from: accounts[0] });
    const roleIdx = parseInt(r);
    if (userIsAdmin) {
      setRole("Admin");
    } else {
      setRole(ROLE_NAMES[roleIdx] || "None");
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setAddress(null);
    setRole("None");
    setIsAdmin(false);
    setContract(null);
    setWeb3(null);
    setRecords([]);
  }, []);

  // Listen for account / chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts) => {
      if (accounts.length > 0) {
        connect().catch(console.error);
      } else {
        disconnect();
      }
    };
    const handleChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    };
  }, [connect, disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      connect().catch(console.error);
    }
  }, [connect]);

  // Load evidence records from blockchain
  const loadRecords = useCallback(async () => {
    if (!contract || !address) return;
    setLoading(true);
    try {
      const count = await contract.methods.getEvidenceCount().call();
      const total = parseInt(count);
      const items = [];
      for (let i = 0; i < total; i++) {
        const ev = await contract.methods.getEvidence(i).call();
        const meta = await contract.methods.getEvidenceMeta(i).call();
        const reviewIdx = parseInt(meta.reviewStatus);
        items.push({
          id: i,
          caseId: ev.caseId.toString(),
          cid: ev.cid,
          fileHash: ev.fileHash,
          description: ev.description,
          uploader: ev.uploadedBy,
          timestamp: parseInt(ev.timestamp) * 1000,
          status: STATUS_LABELS[parseInt(ev.status)] || "Open",
          statusIdx: parseInt(ev.status),
          reviewStatus: REVIEW_LABELS[reviewIdx] || "Pending",
          reviewStatusIdx: reviewIdx,
          reviewedBy: meta.reviewedBy,
          aiFakeScore: parseInt(meta.aiFakeScore),
        });
      }
      setRecords(items);
    } catch (err) {
      console.error("Failed to load evidences:", err);
    } finally {
      setLoading(false);
    }
  }, [contract, address]);

  // Reload records whenever contract or address changes
  useEffect(() => {
    if (contract && address) {
      loadRecords();
    }
  }, [contract, address, loadRecords]);

  // SHA-256 hash of an ArrayBuffer
  const computeSHA256 = useCallback(async (buffer) => {
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  // Upload file to Pinata IPFS
  const uploadToPinata = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: { source: "custodia-evidence-management" },
    });
    formData.append("pinataMetadata", metadata);
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: CONFIG.PINATA_API_KEY,
        pinata_secret_api_key: CONFIG.PINATA_SECRET_API_KEY,
      },
      body: formData,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error("Pinata upload failed: " + errText);
    }
    const result = await response.json();
    return result.IpfsHash;
  }, []);

  // Send a media file to the local deepfake-detection proxy (server/).
  // Returns an integer 0-100. Throws on any failure — caller decides fallback.
  const checkDeepfake = useCallback(async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000); // 2 min (HF cold starts)
    try {
      const response = await fetch(DEEPFAKE_API_URL, { method: "POST", body: formData, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const score = Math.round(Number(data.fakeScore));
      if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("Invalid score returned");
      return score;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  // Upload evidence: hash → AI authenticity check → IPFS → blockchain
  const uploadEvidence = useCallback(
    async (file, caseId, description, onStep, onWarning) => {
      if (!contract || !address) throw new Error("Wallet not connected");

      // Step 0: Hashing
      onStep?.(0);
      const buffer = await file.arrayBuffer();
      const fileHash = await computeSHA256(buffer);

      // Step 1: AI authenticity check (optional — never blocks the upload)
      onStep?.(1);
      let aiFakeScore = AI_SCORE_NOT_CHECKED;
      if (isMediaFile(file)) {
        try {
          aiFakeScore = await checkDeepfake(file);
        } catch (err) {
          console.warn("Deepfake check failed, continuing without score:", err);
          onWarning?.("AI authenticity check unavailable — evidence will be stored without an AI score. (" + (err.message || "unknown error") + ")");
        }
      }

      // Step 2: IPFS upload
      onStep?.(2);
      const cid = await uploadToPinata(file);

      // Step 3: Blockchain write
      onStep?.(3);
      await contract.methods
        .addEvidence(parseInt(caseId), cid, fileHash, description, aiFakeScore)
        .send({ from: address });

      // Step 4: Done
      onStep?.(4);

      // Reload records
      await loadRecords();
      return { cid, fileHash, aiFakeScore };
    },
    [contract, address, computeSHA256, checkDeepfake, uploadToPinata, loadRecords]
  );

  // Approve / reject evidence (intermediary only)
  const reviewEvidence = useCallback(
    async (evidenceId, approve) => {
      if (!contract || !address) throw new Error("Wallet not connected");
      await contract.methods.reviewEvidence(evidenceId, approve).send({ from: address });
      await loadRecords();
    },
    [contract, address, loadRecords]
  );

  // Link a victim wallet to a case (admin only)
  const assignVictimToCase = useCallback(
    async (caseId, victimAddress) => {
      if (!contract || !address) throw new Error("Wallet not connected");
      await contract.methods.assignVictimToCase(parseInt(caseId), victimAddress).send({ from: address });
    },
    [contract, address]
  );

  // Returns a Set of caseIds (strings) among `recs` whose victim is the connected wallet
  const loadMyVictimCases = useCallback(
    async (recs) => {
      if (!contract || !address) return new Set();
      const distinct = [...new Set(recs.map((r) => r.caseId))];
      const mine = new Set();
      for (const caseId of distinct) {
        const victim = await contract.methods.caseVictim(caseId).call();
        if (victim && victim.toLowerCase() === address.toLowerCase()) mine.add(caseId);
      }
      return mine;
    },
    [contract, address]
  );

  // Assign role (admin only)
  const assignRole = useCallback(
    async (userAddress, roleValue) => {
      if (!contract || !address) throw new Error("Wallet not connected");
      await contract.methods.assignRole(userAddress, roleValue).send({ from: address });
    },
    [contract, address]
  );

  // Revoke role (admin only)
  const revokeRole = useCallback(
    async (userAddress) => {
      if (!contract || !address) throw new Error("Wallet not connected");
      await contract.methods.revokeRole(userAddress).send({ from: address });
    },
    [contract, address]
  );

  // Update status (court only)
  const updateStatus = useCallback(
    async (evidenceId, newStatusIdx) => {
      if (!contract || !address) throw new Error("Wallet not connected");
      await contract.methods.updateStatus(evidenceId, newStatusIdx).send({ from: address });
      await loadRecords();
    },
    [contract, address, loadRecords]
  );

  // Verify evidence integrity
  const verifyEvidence = useCallback(
    async (evidenceId, cid, storedHash, onStep) => {
      // Step 0: Fetching from IPFS
      onStep?.(0);
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await fetch(gatewayUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch file from IPFS`);
      }
      const fileBuffer = await response.arrayBuffer();

      // Step 1: Re-hashing
      onStep?.(1);
      const recomputedHash = await computeSHA256(fileBuffer);

      // Step 2: Reading blockchain (already have storedHash)
      onStep?.(2);

      // Step 3: Comparing
      onStep?.(3);

      if (recomputedHash === storedHash) {
        return { outcome: "verified", recomputedHash };
      } else {
        console.warn(`Hash mismatch for evidence #${evidenceId}:`);
        console.warn(`  Stored:     ${storedHash}`);
        console.warn(`  Recomputed: ${recomputedHash}`);
        return { outcome: "mismatch", recomputedHash };
      }
    },
    [computeSHA256]
  );

  const value = {
    web3,
    address,
    role,
    isAdmin,
    records,
    loading,
    connect,
    disconnect,
    loadRecords,
    uploadEvidence,
    assignRole,
    revokeRole,
    updateStatus,
    verifyEvidence,
    reviewEvidence,
    assignVictimToCase,
    loadMyVictimCases,
  };

  return (
    <CustodiaContext.Provider value={value}>{children}</CustodiaContext.Provider>
  );
}

export function useCustodia() {
  const c = useContext(CustodiaContext);
  if (!c) throw new Error("useCustodia must be used within CustodiaProvider");
  return c;
}

// Utility functions
export const truncAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
export const truncMid = (s, head = 10, tail = 6) =>
  !s ? "—" : s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
export const isAddress = (a) => /^0x[a-fA-F0-9]{40}$/.test(a.trim());
export const fmtTime = (t) =>
  new Date(t).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
