// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RecordAnchor
 * @notice Immutable cryptographic Merkle root anchoring for NGO Digital Records & Audit Trails.
 * Deployed to Polygon (MATIC) / Ethereum L2 to guarantee tamper-proof audit trails for humanitarian organizations.
 */
contract RecordAnchor {
    struct AnchorRecord {
        bytes32 merkleRoot;
        bytes32 ngoIdHash;
        uint256 blockNumber;
        uint256 timestamp;
        address anchoredBy;
        string batchType;
        uint256 leafCount;
    }

    address public owner;
    
    // Mapping from Merkle root to anchor metadata
    mapping(bytes32 => AnchorRecord) public anchors;
    
    // Index of all roots anchored for a specific NGO hash
    mapping(bytes32 => bytes32[]) public ngoRoots;

    // Events
    event MerkleRootAnchored(
        bytes32 indexed merkleRoot,
        bytes32 indexed ngoIdHash,
        string batchType,
        uint256 leafCount,
        uint256 timestamp,
        address anchoredBy
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "RecordAnchor: Caller is not the contract owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Anchor a batch Merkle root to the blockchain
     * @param _merkleRoot The 32-byte Merkle root representing the batch of records/audits
     * @param _ngoIdHash Keccak256 hash of the NGO tenant identifier
     * @param _batchType Label describing the batch (e.g. "records", "audit_logs", "compliance_daily")
     * @param _leafCount Total number of leaves in the anchored Merkle tree
     */
    function anchorRoot(
        bytes32 _merkleRoot,
        bytes32 _ngoIdHash,
        string calldata _batchType,
        uint256 _leafCount
    ) external returns (bool) {
        require(_merkleRoot != bytes32(0), "RecordAnchor: Invalid zero Merkle root");
        require(anchors[_merkleRoot].timestamp == 0, "RecordAnchor: Merkle root already anchored");

        anchors[_merkleRoot] = AnchorRecord({
            merkleRoot: _merkleRoot,
            ngoIdHash: _ngoIdHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            anchoredBy: msg.sender,
            batchType: _batchType,
            leafCount: _leafCount
        });

        ngoRoots[_ngoIdHash].push(_merkleRoot);

        emit MerkleRootAnchored(
            _merkleRoot,
            _ngoIdHash,
            _batchType,
            _leafCount,
            block.timestamp,
            msg.sender
        );

        return true;
    }

    /**
     * @notice Verify whether a Merkle root exists on-chain and retrieve its anchoring proof metadata
     * @param _merkleRoot The 32-byte Merkle root to inspect
     */
    function verifyRoot(bytes32 _merkleRoot) external view returns (
        bool exists,
        bytes32 ngoIdHash,
        uint256 blockNumber,
        uint256 timestamp,
        address anchoredBy,
        string memory batchType,
        uint256 leafCount
    ) {
        AnchorRecord memory record = anchors[_merkleRoot];
        if (record.timestamp == 0) {
            return (false, bytes32(0), 0, 0, address(0), "", 0);
        }
        return (
            true,
            record.ngoIdHash,
            record.blockNumber,
            record.timestamp,
            record.anchoredBy,
            record.batchType,
            record.leafCount
        );
    }

    /**
     * @notice Retrieve all anchored Merkle roots for a specific NGO
     * @param _ngoIdHash Keccak256 hash of the NGO ObjectId
     */
    function getNgoRoots(bytes32 _ngoIdHash) external view returns (bytes32[] memory) {
        return ngoRoots[_ngoIdHash];
    }

    /**
     * @notice Transfer contract administrative ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RecordAnchor: New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
