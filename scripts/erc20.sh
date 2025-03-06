#!/usr/bin/env -S pkgx +gum +forge bash -e
# shellcheck shell=bash

set -o pipefail

# ERC20 token deployment script using Foundry
# Collects parameters via gum and deploys an ERC20 token to the specified network

gum style --border normal --border-foreground 212 --padding "1 2" --width 50 --foreground 212 --bold "ERC20 Token Deployment"

# Get token parameters with enhanced explanations
gum style --foreground 6 --bold "Token Name:"
gum style --foreground 7 "The full name of your token as it will appear on blockchain explorers (e.g. 'Bitcoin', 'Ethereum')"
TOKEN_NAME=$(gum input --placeholder "Token name (e.g. My Token)")

gum style --foreground 6 --bold "Token Symbol:"
gum style --foreground 7 "A short ticker symbol for your token, typically 3-5 capital letters (e.g. 'BTC', 'ETH')"
TOKEN_SYMBOL=$(gum input --placeholder "Token symbol (e.g. MTK)")

gum style --foreground 6 --bold "Token Decimals:"
gum style --foreground 7 "Determines token divisibility. Standard is 18 (same as ETH). Lower values like 6 or 8 are common for stablecoins."
TOKEN_DECIMALS=$(gum input --placeholder "Decimals (usually 18)" --value "18")

gum style --foreground 6 --bold "Initial Supply:"
gum style --foreground 7 "The total number of whole tokens to mint at deployment. Default is 10 billion (10,000,000,000)."
TOKEN_SUPPLY=$(gum input --placeholder "Initial supply (in whole tokens)" --value "10000000000")

gum style --foreground 6 --bold "Owner Address:"
gum style --foreground 7 "The Ethereum address that will receive the initial token supply and have owner privileges (minting)."
gum style --foreground 3 "IMPORTANT: This must be a valid address you control on the protocol you choose."
TOKEN_OWNER=$(gum input --placeholder "Owner address (0x...)")

# Check if owner address is provided
if [ -z "$TOKEN_OWNER" ]; then
  gum style --foreground 9 --bold --foreground 9 "Error: Owner address is required. The address should start with '0x' and be 42 characters long."
  exit 1
fi

# Verify inputs
gum style --foreground 6 --bold --underline "Token Configuration Summary:"
echo ""
echo "$(gum style --foreground 6 "Name:    ")$(gum style --foreground 2 "$TOKEN_NAME")"
echo "$(gum style --foreground 6 "Symbol:  ")$(gum style --foreground 2 "$TOKEN_SYMBOL")"
echo "$(gum style --foreground 6 "Decimals:")$(gum style --foreground 2 "$TOKEN_DECIMALS")"
echo "$(gum style --foreground 6 "Supply:  ")$(gum style --foreground 2 "$TOKEN_SUPPLY") tokens"
echo "$(gum style --foreground 6 "Owner:   ")$(gum style --foreground 2 "$TOKEN_OWNER")"
echo ""

if ! gum confirm "Is this configuration correct?"; then
  gum style --foreground 9 "Deployment canceled"
  exit 0
fi

# Create temporary directory
TMP_DIR=$(mktemp -d)
# trap 'rm -rf "$TMP_DIR"' EXIT

# Calculate supply with decimals
SUPPLY_WITH_DECIMALS=$(python3 -c "print(int($TOKEN_SUPPLY) * (10 ** int($TOKEN_DECIMALS)))")

# Select network for deployment
gum style --foreground 6 --bold "Select Deployment Network:"
gum style --foreground 7 "Choose the blockchain network where your token will be deployed."
NETWORK=$(gum choose "Ethereum Mainnet" "Sepolia" "Goerli" "Polygon" "Optimism" "Arbitrum" "TEA Assam" "Local")

# Map selected network to RPC URL and chain ID
case "$NETWORK" in
  "Ethereum Mainnet")
    RPC_URL="https://ethereum-rpc.publicnode.com"
    BLOCK_EXPLORER="https://etherscan.io"
    CHAIN_ID=1
    ;;
  "Sepolia")
    RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
    BLOCK_EXPLORER="https://sepolia.etherscan.io"
    CHAIN_ID=11155111
    ;;
  "Goerli")
    RPC_URL="https://ethereum-goerli-rpc.publicnode.com"
    BLOCK_EXPLORER="https://goerli.etherscan.io"
    CHAIN_ID=5
    ;;
  "Polygon")
    RPC_URL="https://polygon-bor-rpc.publicnode.com"
    BLOCK_EXPLORER="https://polygonscan.com"
    CHAIN_ID=137
    ;;
  "Optimism")
    RPC_URL="https://optimism-rpc.publicnode.com"
    BLOCK_EXPLORER="https://optimistic.etherscan.io"
    CHAIN_ID=10
    ;;
  "Arbitrum")
    RPC_URL="https://arbitrum-one-rpc.publicnode.com"
    BLOCK_EXPLORER="https://arbiscan.io"
    CHAIN_ID=42161
    ;;
  "TEA Assam")
    RPC_URL="https://assam-rpc.tea.xyz"
    BLOCK_EXPLORER="https://assam.tea.xyz"
    CHAIN_ID=93384
    ;;
  "Local")
    RPC_URL="http://localhost:8545"
    BLOCK_EXPLORER="http://localhost:3000"
    CHAIN_ID=31337
    gum style --foreground 3 "Make sure your local Hardhat node is running."
    gum style --foreground 3 "You can start it with: npx hardhat node"
    ;;
  *)
    gum style --foreground 9 'Invalid network selection'
    exit 1
    ;;
esac

# Choose signing method
gum style --foreground 6 'Choose how to sign the transaction:'
SIGNING_METHOD=$(gum choose "Private Key" "Mnemonic Phrase" "Ledger" "Trezor")

# Set up deployment command with common arguments
declare -a DEPLOY_CMD
DEPLOY_CMD=(forge create --broadcast --rpc-url "$RPC_URL" --chain-id "$CHAIN_ID" "src/$TOKEN_SYMBOL.sol:$TOKEN_SYMBOL")
declare -a VARIADIC_ARGS
VARIADIC_ARGS=(--constructor-args "$TOKEN_OWNER")

declare -a SIGNATURE

case "$SIGNING_METHOD" in
  "Private Key")
    gum style --foreground 3 'Please enter your private key for deployment:'
    PRIVATE_KEY=$(gum input --password --placeholder "Enter private key (0x...)")

    if [ -z "$PRIVATE_KEY" ]; then
      gum style --foreground 9 'Private key is required for deployment'
      exit 1
    fi

    SIGNATURE=(--private-key "$PRIVATE_KEY")
    ;;

  "Mnemonic Phrase")
    gum style --foreground 3 'Please enter your mnemonic phrase:'
    MNEMONIC=$(gum input --password --placeholder "Enter mnemonic phrase (12-24 words)")

    if [ -z "$MNEMONIC" ]; then
      gum style --foreground 9 'Mnemonic phrase is required for deployment'
      exit 1
    fi

    # Create a keystore file with the mnemonic
    echo "$MNEMONIC" > "$TMP_DIR/mnemonic.txt"

    SIGNATURE=(--mnemonic-path "$TMP_DIR/mnemonic.txt" --mnemonic-index 0)
    ;;

  "Ledger")
    SIGNATURE=(--ledger --hd-path="m/44'/60'/0'/0/0")
    gum style --foreground 3 'Please connect your Ledger device and open the Ethereum app'
    gum confirm "Is your Ledger ready?" || exit 1
    ;;

  "Trezor")
    SIGNATURE=(--trezor --hd-path="m/44'/60'/0'/0/0")
    gum style --foreground 3 'Please connect your Trezor device'
    gum confirm "Is your Trezor ready?" || exit 1
    ;;

  *)
    gum style --foreground 9 'Invalid signing method'
    exit 1
    ;;
esac

# Initialize Foundry project
gum style --foreground 6 "Setting up Foundry project..."
cd "$TMP_DIR"
gum spin --title "Initializing Foundry project..." -- forge init --no-commit --quiet

# Create ERC20 token contract
cat > "src/$TOKEN_SYMBOL.sol" << EOL
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract $TOKEN_SYMBOL is ERC20, ERC20Burnable, Ownable {
    constructor(address initialOwner)
        ERC20("$TOKEN_NAME", "$TOKEN_SYMBOL")
        Ownable(initialOwner)
    {
        _mint(initialOwner, ${SUPPLY_WITH_DECIMALS});
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
EOL

# Create a foundry.toml file in the temp directory
cat > "foundry.toml" << EOL
[profile.default]
src = '.'
out = 'out'
libs = ['lib']
remappings = ['@openzeppelin/=lib/openzeppelin-contracts/']
EOL

# Install OpenZeppelin contracts
gum style --foreground 6 "Installing OpenZeppelin contracts..."
gum spin --title "Installing OpenZeppelin contracts..." --  forge install OpenZeppelin/openzeppelin-contracts --no-commit

# unset fail on error
set +e
# unset pipefail
set +o pipefail

# Deploy the token
gum style --foreground 6 "Deploying token to $NETWORK..."

# Check if deployment was successful
if "${DEPLOY_CMD[@]}" "${SIGNATURE[@]}" "${VARIADIC_ARGS[@]}"; then
  gum style --foreground 10 '✓ Token deployed successfully!'
  gum style --foreground 6 'You can view your token on the blockchain explorer'
  gum style --foreground 6 'Note that it may take a few minutes for the transaction to be confirmed.'
  gum style --foreground 6 "$BLOCK_EXPLORER/address/$TOKEN_OWNER"
else
  gum style --foreground 9 '✗ Deployment failed'

  # Cleanup any sensitive files
  if [ "$SIGNING_METHOD" = "Mnemonic Phrase" ] && [ -f "$TMP_DIR/mnemonic.txt" ]; then
    rm -f "$TMP_DIR/mnemonic.txt"
  fi
fi