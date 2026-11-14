# MissionLog

Records each flown mission (room, manifest hash, score) on Arbitrum Sepolia, a test network. Play only: no money moves.

## Deploy

1. Install Foundry: `curl -L https://foundry.paradigm.xyz | bash`, then `foundryup`.
2. Get test ETH on Arbitrum Sepolia for the relayer key from a faucet.
3. From this folder:

```
forge build
forge create src/MissionLog.sol:MissionLog --rpc-url arbitrum_sepolia --private-key $RELAYER_PRIVATE_KEY --broadcast
```

4. Put the deployed address in Vercel as `MISSION_LOG_ADDRESS`. The app's server route sends the transaction with `RELAYER_PRIVATE_KEY`, so players never need a wallet.

The relayer key holds test ETH only. Never put a key with real funds here.
