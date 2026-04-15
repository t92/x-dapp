// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract RedPacket {
    uint8 public constant PACKET_TYPE_RANDOM = 0;
    uint8 public constant PACKET_TYPE_EQUAL = 1;

    struct Packet {
        address sender;
        address token; // address(0) means ETH
        uint256 totalAmount;
        uint256 remainingAmount;
        uint32 totalCount;
        uint32 remainingCount;
        uint64 deadline;
        uint8 packetType; // 0=random, 1=equal
        string message;
        bool refunded;
        bool exists;
    }

    struct ClaimInfo {
        bool claimed;
        uint256 amount;
        uint64 claimedAt;
    }

    struct ClaimedPacketView {
        bytes32 codeHash;
        uint256 packetId;
        uint256 amount;
        address sender;
        address token;
        string message;
        uint64 claimedAt;
    }

    uint256 public nextPacketId = 1;

    mapping(uint256 => Packet) public packets;
    mapping(bytes32 => uint256) public packetIdByCodeHash;
    mapping(uint256 => bytes32) public codeHashByPacketId;
    mapping(uint256 => mapping(address => ClaimInfo)) public claimInfoByPacketAndUser;
    mapping(address => uint256[]) private userClaimedPacketIds;

    event PacketCreated(
        uint256 indexed packetId,
        address indexed sender,
        address indexed token,
        uint256 totalAmount,
        uint32 count,
        uint64 deadline,
        uint8 packetType,
        bytes32 codeHash
    );

    event PacketClaimed(uint256 indexed packetId, address indexed claimer, uint256 amount);

    event PacketRefunded(uint256 indexed packetId, address indexed sender, uint256 amount);

    function createRedPacket(
        address token,
        uint256 totalAmount,
        uint32 count,
        uint8 packetType,
        string calldata message
    ) external payable returns (uint256 packetId, bytes32 codeHash) {
        require(count > 0, "count must > 0");
        require(totalAmount >= count, "totalAmount must >= count");
        require(
            packetType == PACKET_TYPE_RANDOM || packetType == PACKET_TYPE_EQUAL,
            "invalid packetType"
        );
        if (packetType == PACKET_TYPE_EQUAL) {
            require(totalAmount % count == 0, "equal packet requires divisible amount");
        }

        if (token == address(0)) {
            require(msg.value == totalAmount, "invalid eth amount");
        } else {
            require(msg.value == 0, "dont send eth for token packet");
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            require(IERC20(token).transferFrom(msg.sender, address(this), totalAmount), "transferFrom failed");
            uint256 balanceAfter = IERC20(token).balanceOf(address(this));
            require(balanceAfter >= balanceBefore, "invalid token balance");
            require(
                balanceAfter - balanceBefore == totalAmount,
                "fee-on-transfer token not supported"
            );
        }

        packetId = nextPacketId++;
        codeHash = keccak256(
            abi.encodePacked(
                block.prevrandao,
                block.timestamp,
                msg.sender,
                packetId,
                totalAmount,
                count,
                packetType,
                message
            )
        );

        require(packetIdByCodeHash[codeHash] == 0, "code hash collision");
        packetIdByCodeHash[codeHash] = packetId;
        codeHashByPacketId[packetId] = codeHash;

        uint64 deadline = uint64(block.timestamp + 60 minutes);
        packets[packetId] = Packet({
            sender: msg.sender,
            token: token,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
            totalCount: count,
            remainingCount: count,
            deadline: deadline,
            packetType: packetType,
            message: message,
            refunded: false,
            exists: true
        });

        emit PacketCreated(
            packetId,
            msg.sender,
            token,
            totalAmount,
            count,
            deadline,
            packetType,
            codeHash
        );
    }

    function claim(bytes32 codeHash) external returns (uint256 amount) {
        uint256 packetId = packetIdByCodeHash[codeHash];
        require(packetId != 0, "invalid code");

        Packet storage packet = packets[packetId];
        require(packet.exists, "packet not found");
        require(!packet.refunded, "already refunded");
        require(block.timestamp < packet.deadline, "expired");
        require(packet.remainingCount > 0, "empty");

        ClaimInfo storage info = claimInfoByPacketAndUser[packetId][msg.sender];
        require(!info.claimed, "already claimed");

        amount = _takeClaimAmount(packetId, msg.sender);

        info.claimed = true;
        info.amount = amount;
        info.claimedAt = uint64(block.timestamp);

        packet.remainingCount -= 1;
        packet.remainingAmount -= amount;

        _transferOut(packet.token, msg.sender, amount);
        userClaimedPacketIds[msg.sender].push(packetId);

        emit PacketClaimed(packetId, msg.sender, amount);
    }

    function refund(uint256 packetId) external {
        Packet storage packet = packets[packetId];

        require(packet.exists, "packet not found");
        require(msg.sender == packet.sender, "not sender");
        require(block.timestamp >= packet.deadline, "not expired");
        require(!packet.refunded, "already refunded");
        require(packet.remainingAmount > 0, "nothing to refund");

        uint256 amount = packet.remainingAmount;

        packet.refunded = true;
        packet.remainingAmount = 0;
        packet.remainingCount = 0;

        _transferOut(packet.token, packet.sender, amount);

        emit PacketRefunded(packetId, packet.sender, amount);
    }

    function getPacketByCodeHash(
        bytes32 codeHash
    ) external view returns (uint256 packetId, Packet memory packet) {
        packetId = packetIdByCodeHash[codeHash];
        require(packetId != 0, "invalid code");
        packet = packets[packetId];
    }

    function getClaimStatusByCodeHash(
        bytes32 codeHash,
        address user
    )
        external
        view
        returns (
            bool hasClaimed,
            uint256 amount,
            address sender,
            string memory message,
            address token,
            uint64 claimedAt,
            uint256 packetId
        )
    {
        packetId = packetIdByCodeHash[codeHash];
        if (packetId == 0) {
            return (false, 0, address(0), "", address(0), 0, 0);
        }

        ClaimInfo memory info = claimInfoByPacketAndUser[packetId][user];
        Packet storage packet = packets[packetId];
        return (
            info.claimed,
            info.amount,
            packet.sender,
            packet.message,
            packet.token,
            info.claimedAt,
            packetId
        );
    }

    function getUserClaimHistory(
        address user
    ) external view returns (ClaimedPacketView[] memory records) {
        uint256[] storage ids = userClaimedPacketIds[user];
        uint256 len = ids.length;
        records = new ClaimedPacketView[](len);

        for (uint256 i = 0; i < len; i++) {
            uint256 packetId = ids[i];
            ClaimInfo memory info = claimInfoByPacketAndUser[packetId][user];
            Packet storage packet = packets[packetId];

            records[i] = ClaimedPacketView({
                codeHash: codeHashByPacketId[packetId],
                packetId: packetId,
                amount: info.amount,
                sender: packet.sender,
                token: packet.token,
                message: packet.message,
                claimedAt: info.claimedAt
            });
        }
    }

    function getUserClaimHistoryPage(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimedPacketView[] memory records, uint256 total) {
        uint256[] storage ids = userClaimedPacketIds[user];
        total = ids.length;

        if (offset >= total || limit == 0) {
            return (new ClaimedPacketView[](0), total);
        }

        uint256 endExclusive = offset + limit;
        if (endExclusive > total) {
            endExclusive = total;
        }

        uint256 size = endExclusive - offset;
        records = new ClaimedPacketView[](size);

        for (uint256 i = 0; i < size; i++) {
            uint256 packetId = ids[offset + i];
            ClaimInfo memory info = claimInfoByPacketAndUser[packetId][user];
            Packet storage packet = packets[packetId];

            records[i] = ClaimedPacketView({
                codeHash: codeHashByPacketId[packetId],
                packetId: packetId,
                amount: info.amount,
                sender: packet.sender,
                token: packet.token,
                message: packet.message,
                claimedAt: info.claimedAt
            });
        }
    }

    function getAnyOneBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return msg.sender.balance;
        }
        return IERC20(token).balanceOf(msg.sender);
    }

    function _takeClaimAmount(uint256 packetId, address claimer) internal view returns (uint256 amount) {
        Packet storage packet = packets[packetId];

        if (packet.remainingCount == 1) {
            return packet.remainingAmount;
        }

        if (packet.packetType == PACKET_TYPE_EQUAL) {
            return packet.remainingAmount / packet.remainingCount;
        }

        uint256 remainingAmount = packet.remainingAmount;
        uint256 remainingCount = packet.remainingCount;
        uint256 maxAmount = remainingAmount - (remainingCount - 1);

        amount =
            (uint256(
                keccak256(
                    abi.encodePacked(
                        block.prevrandao,
                        block.timestamp,
                        claimer,
                        packetId,
                        remainingAmount,
                        remainingCount
                    )
                )
            ) % maxAmount) +
            1;
    }

    function _transferOut(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "ETH transfer failed");
        } else {
            require(IERC20(token).transfer(to, amount), "token transfer failed");
        }
    }

    receive() external payable {}
}
