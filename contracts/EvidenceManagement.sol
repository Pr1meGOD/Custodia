// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EvidenceManagement
 * @dev Blockchain-based Digital Evidence Management System
 * @notice Stores evidence metadata (IPFS CID + SHA-256 hash) on-chain for tamper-proof verification
 */
contract EvidenceManagement {

    // ── Enums ──────────────────────────────────────────────────────────
    enum Role { None, Police, Court, Intermediary, Victim }
    enum Status { Open, UnderReview, Closed }
    enum ReviewStatus { Pending, Approved, Rejected }

    // ── Constants ──────────────────────────────────────────────────────
    /// @dev Sentinel for aiFakeScore meaning "not checked / not applicable"
    uint8 public constant AI_SCORE_NOT_CHECKED = 255;

    // ── State Variables ────────────────────────────────────────────────
    address public admin;
    mapping(address => Role) public roles;
    mapping(uint256 => address) public caseVictim;   // caseId => victim wallet

    // ── Structs ────────────────────────────────────────────────────────
    struct Evidence {
        uint256 caseId;
        string  cid;          // IPFS Content Identifier
        string  fileHash;     // SHA-256 hash of the original file
        string  description;
        address uploadedBy;
        uint256 timestamp;
        Status  status;       // Case status: Open, UnderReview, Closed
        ReviewStatus reviewStatus; // Intermediary review: Pending, Approved, Rejected
        address reviewedBy;   // Intermediary who last reviewed (address(0) if pending)
        uint8   aiFakeScore;  // 0-100 = AI-generated likelihood, 255 = not checked
    }

    Evidence[] public evidences;

    // ── Events ─────────────────────────────────────────────────────────
    event RoleAssigned(address indexed user, Role role);
    event RoleRevoked(address indexed user);
    event EvidenceAdded(
        uint256 indexed evidenceId,
        uint256 caseId,
        string  cid,
        address indexed uploadedBy
    );
    event StatusUpdated(uint256 indexed evidenceId, Status newStatus);
    event EvidenceReviewed(uint256 indexed evidenceId, bool approved, address indexed reviewer);
    event VictimAssigned(uint256 indexed caseId, address indexed victim);

    // ── Modifiers ──────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyPolice() {
        require(roles[msg.sender] == Role.Police, "Only police can perform this action");
        _;
    }

    modifier onlyCourt() {
        require(roles[msg.sender] == Role.Court, "Only court officials can perform this action");
        _;
    }

    modifier onlyIntermediary() {
        require(roles[msg.sender] == Role.Intermediary, "Only intermediaries can perform this action");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ── Role Management ────────────────────────────────────────────────

    /**
     * @dev Assign a role to an address. Only the admin (deployer) can call this.
     * @param user  The wallet address to assign the role to
     * @param role  The role to assign (1 = Police, 2 = Court, 3 = Intermediary, 4 = Victim)
     */
    function assignRole(address user, Role role) external onlyAdmin {
        require(role != Role.None, "Use revokeRole to remove a role");
        _setRole(user, role);
    }

    /**
     * @dev Revoke a user's role (set back to None). Only admin.
     * @param user  The wallet address whose role to revoke
     */
    function revokeRole(address user) external onlyAdmin {
        require(roles[user] != Role.None, "User has no role to revoke");
        roles[user] = Role.None;
        emit RoleRevoked(user);
    }

    /**
     * @dev Returns the caller's current role.
     */
    function getMyRole() external view returns (Role) {
        return roles[msg.sender];
    }

    /**
     * @dev Link a victim wallet to a case and grant it the Victim role. Only admin.
     * @param caseId  The numeric case identifier
     * @param victim  The victim's wallet address
     */
    function assignVictimToCase(uint256 caseId, address victim) external onlyAdmin {
        require(victim != address(0), "Invalid victim address");
        caseVictim[caseId] = victim;
        _setRole(victim, Role.Victim);
        emit VictimAssigned(caseId, victim);
    }

    function _setRole(address user, Role role) internal {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    // ── Evidence Management ────────────────────────────────────────────

    /**
     * @dev Add a new evidence record. Only police officers can call this.
     * @param caseId       The numeric case identifier
     * @param cid          The IPFS CID where the file is stored
     * @param fileHash     The SHA-256 hash of the original file
     * @param description  A human-readable description of the evidence
     * @param aiFakeScore  AI-generated likelihood 0-100, or 255 if not checked
     */
    function addEvidence(
        uint256 caseId,
        string calldata cid,
        string calldata fileHash,
        string calldata description,
        uint8 aiFakeScore
    ) external onlyPolice {
        require(aiFakeScore <= 100 || aiFakeScore == AI_SCORE_NOT_CHECKED, "Invalid AI score");
        evidences.push(Evidence({
            caseId:       caseId,
            cid:          cid,
            fileHash:     fileHash,
            description:  description,
            uploadedBy:   msg.sender,
            timestamp:    block.timestamp,
            status:       Status.Open,
            reviewStatus: ReviewStatus.Pending,
            reviewedBy:   address(0),
            aiFakeScore:  aiFakeScore
        }));

        emit EvidenceAdded(evidences.length - 1, caseId, cid, msg.sender);
    }

    /**
     * @dev Returns the total number of evidence records stored.
     */
    function getEvidenceCount() external view returns (uint256) {
        return evidences.length;
    }

    /**
     * @dev Returns a single evidence record by its index.
     * @param id  The index of the evidence in the array
     */
    function getEvidence(uint256 id) external view returns (
        uint256 caseId,
        string memory cid,
        string memory fileHash,
        string memory description,
        address uploadedBy,
        uint256 timestamp,
        Status status
    ) {
        require(id < evidences.length, "Evidence does not exist");
        Evidence storage e = evidences[id];
        return (e.caseId, e.cid, e.fileHash, e.description, e.uploadedBy, e.timestamp, e.status);
    }

    /**
     * @dev Returns the review + AI-check metadata of an evidence record.
     *      Kept separate from getEvidence() so its return signature stays unchanged
     *      (and to avoid "stack too deep" with many return values).
     * @param id  The index of the evidence in the array
     */
    function getEvidenceMeta(uint256 id) external view returns (
        ReviewStatus reviewStatus,
        address reviewedBy,
        uint8 aiFakeScore
    ) {
        require(id < evidences.length, "Evidence does not exist");
        Evidence storage e = evidences[id];
        return (e.reviewStatus, e.reviewedBy, e.aiFakeScore);
    }

    // ── Intermediary Review ────────────────────────────────────────────

    /**
     * @dev Approve or reject an evidence record. Only intermediaries can call this.
     * @param evidenceId  The index of the evidence in the array
     * @param approve     true = Approved, false = Rejected
     */
    function reviewEvidence(uint256 evidenceId, bool approve) external onlyIntermediary {
        require(evidenceId < evidences.length, "Evidence does not exist");
        Evidence storage e = evidences[evidenceId];
        e.reviewStatus = approve ? ReviewStatus.Approved : ReviewStatus.Rejected;
        e.reviewedBy = msg.sender;
        emit EvidenceReviewed(evidenceId, approve, msg.sender);
    }

    // ── Case Status Management ─────────────────────────────────────────

    /**
     * @dev Update the status of an evidence record. Only court officials can call this.
     * @param id         The index of the evidence in the array
     * @param newStatus  The new status to set (0=Open, 1=UnderReview, 2=Closed)
     */
    function updateStatus(uint256 id, Status newStatus) external onlyCourt {
        require(id < evidences.length, "Evidence does not exist");
        evidences[id].status = newStatus;
        emit StatusUpdated(id, newStatus);
    }
}
