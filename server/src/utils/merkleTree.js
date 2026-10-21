const { ethers } = require('ethers');

/**
 * Standard Cryptographic Merkle Tree
 * Fully compatible with OpenZeppelin MerkleProof.sol and EVM smart contracts.
 */
class MerkleTree {
  /**
   * @param {string[]} rawLeaves Array of hex strings or data strings to hash into leaves
   */
  constructor(rawLeaves = []) {
    if (!Array.isArray(rawLeaves)) {
      throw new Error('Leaves must be an array');
    }

    this.leaves = rawLeaves.map((leaf) => this.hashLeaf(leaf));
    this.layers = [];
    if (this.leaves.length > 0) {
      this.buildTree();
    }
  }

  /**
   * Hash leaf to 32-byte bytes32 representation
   */
  hashLeaf(value) {
    if (!value) {
      return ethers.keccak256(ethers.toUtf8Bytes(''));
    }
    if (typeof value === 'string' && value.startsWith('0x') && value.length === 66) {
      return value.toLowerCase();
    }
    if (typeof value === 'string') {
      return ethers.keccak256(ethers.toUtf8Bytes(value));
    }
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(value)));
  }

  /**
   * Combined hash of two sibling nodes (sorted order for commutative verification)
   */
  hashPair(a, b) {
    if (!b) return a;
    // Sort pair to match OpenZeppelin MerkleProof standard
    const [left, right] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
    return ethers.keccak256(ethers.concat([left, right]));
  }

  /**
   * Construct all layers of the Merkle Tree
   */
  buildTree() {
    this.layers = [this.leaves];

    while (this.layers[this.layers.length - 1].length > 1) {
      const currentLayer = this.layers[this.layers.length - 1];
      const nextLayer = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          nextLayer.push(this.hashPair(currentLayer[i], currentLayer[i + 1]));
        } else {
          // Odd leaf: promote to next level (or hash with itself)
          nextLayer.push(currentLayer[i]);
        }
      }

      this.layers.push(nextLayer);
    }
  }

  /**
   * Get the 32-byte Merkle Root hex
   */
  getRoot() {
    if (!this.layers.length || !this.layers[this.layers.length - 1].length) {
      return ethers.ZeroHash;
    }
    return this.layers[this.layers.length - 1][0];
  }

  /**
   * Generate Merkle inclusion proof for a given leaf or leaf index
   */
  getProof(leafOrIndex) {
    let index = typeof leafOrIndex === 'number'
      ? leafOrIndex
      : this.leaves.indexOf(this.hashLeaf(leafOrIndex));

    if (index === -1 || index >= this.leaves.length) {
      return [];
    }

    const proof = [];

    for (let layerIndex = 0; layerIndex < this.layers.length - 1; layerIndex++) {
      const layer = this.layers[layerIndex];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * OpenZeppelin compatible Merkle Proof Verification
   * @param {string} leaf 32-byte hex leaf
   * @param {string[]} proof Array of sibling 32-byte hex hashes
   * @param {string} root Expected 32-byte hex root
   */
  static verifyProof(leaf, proof, root) {
    if (!leaf || !root) return false;
    let computedHash = leaf.startsWith('0x') && leaf.length === 66
      ? leaf.toLowerCase()
      : ethers.keccak256(ethers.toUtf8Bytes(leaf));

    for (const sibling of proof) {
      const [left, right] = computedHash < sibling.toLowerCase()
        ? [computedHash, sibling.toLowerCase()]
        : [sibling.toLowerCase(), computedHash];
      computedHash = ethers.keccak256(ethers.concat([left, right]));
    }

    return computedHash.toLowerCase() === root.toLowerCase();
  }
}

module.exports = MerkleTree;
