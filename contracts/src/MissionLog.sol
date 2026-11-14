// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @notice Public record of every flown mission, on a test network only. No money moves here.
contract MissionLog {
    event MissionRecorded(bytes32 indexed roomId, bytes32 indexed manifestHash, uint32 score, address recorder);

    function record(bytes32 roomId, bytes32 manifestHash, uint32 score) external {
        emit MissionRecorded(roomId, manifestHash, score, msg.sender);
    }
}
