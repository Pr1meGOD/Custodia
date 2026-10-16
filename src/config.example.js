// ─── Configuration ─────────────────────────────────────────────────────────
// Fill these in after setup — see README.md
const CONFIG = {
  PINATA_API_KEY: "",
  PINATA_SECRET_API_KEY: "",
  CONTRACT_ADDRESS: "",
  CONTRACT_ABI: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "evidenceId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "uploadedBy",
          "type": "address"
        }
      ],
      "name": "EvidenceAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "evidenceId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "approved",
          "type": "bool"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "reviewer",
          "type": "address"
        }
      ],
      "name": "EvidenceReviewed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum EvidenceManagement.Role",
          "name": "role",
          "type": "uint8"
        }
      ],
      "name": "RoleAssigned",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "evidenceId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum EvidenceManagement.Status",
          "name": "newStatus",
          "type": "uint8"
        }
      ],
      "name": "StatusUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "victim",
          "type": "address"
        }
      ],
      "name": "VictimAssigned",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "AI_SCORE_NOT_CHECKED",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "admin",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "caseVictim",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "evidences",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "fileHash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "uploadedBy",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "enum EvidenceManagement.Status",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "enum EvidenceManagement.ReviewStatus",
          "name": "reviewStatus",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "reviewedBy",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "aiFakeScore",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "roles",
      "outputs": [
        {
          "internalType": "enum EvidenceManagement.Role",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "enum EvidenceManagement.Role",
          "name": "role",
          "type": "uint8"
        }
      ],
      "name": "assignRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMyRole",
      "outputs": [
        {
          "internalType": "enum EvidenceManagement.Role",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "victim",
          "type": "address"
        }
      ],
      "name": "assignVictimToCase",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "fileHash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "aiFakeScore",
          "type": "uint8"
        }
      ],
      "name": "addEvidence",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getEvidenceCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "getEvidence",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "caseId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "cid",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "fileHash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "uploadedBy",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "enum EvidenceManagement.Status",
          "name": "status",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "getEvidenceMeta",
      "outputs": [
        {
          "internalType": "enum EvidenceManagement.ReviewStatus",
          "name": "reviewStatus",
          "type": "uint8"
        },
        {
          "internalType": "address",
          "name": "reviewedBy",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "aiFakeScore",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "evidenceId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "approve",
          "type": "bool"
        }
      ],
      "name": "reviewEvidence",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "enum EvidenceManagement.Status",
          "name": "newStatus",
          "type": "uint8"
        }
      ],
      "name": "updateStatus",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
};
