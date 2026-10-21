/**
 * ABI for RecordAnchor smart contract
 */
const RECORD_ANCHOR_ABI = [
  "function anchorRoot(bytes32 _merkleRoot, bytes32 _ngoIdHash, string calldata _batchType, uint256 _leafCount) external returns (bool)",
  "function verifyRoot(bytes32 _merkleRoot) external view returns (bool exists, bytes32 ngoIdHash, uint256 blockNumber, uint256 timestamp, address anchoredBy, string memory batchType, uint256 leafCount)",
  "function getNgoRoots(bytes32 _ngoIdHash) external view returns (bytes32[] memory)",
  "function owner() external view returns (address)",
  "event MerkleRootAnchored(bytes32 indexed merkleRoot, bytes32 indexed ngoIdHash, string batchType, uint256 leafCount, uint256 timestamp, address anchoredBy)"
];

module.exports = { RECORD_ANCHOR_ABI };
