import assert from "node:assert/strict";
import { network } from "hardhat";

describe("RedPacket", function () {
  it("emits PacketCreated and can parse packetId/codeHash from receipt logs", async function () {
    const { ethers } = await network.connect();
    const [sender, claimer] = await ethers.getSigners();
    const RedPacket = await ethers.getContractFactory("RedPacket");
    const redPacket = await RedPacket.deploy();
    await redPacket.waitForDeployment();

    const totalAmount = ethers.parseEther("1");
    const count = 5;
    const packetTypeRandom = 0;
    const message = "Happy Holidays!";

    const tx = await redPacket.createRedPacket(
      ethers.ZeroAddress,
      totalAmount,
      count,
      packetTypeRandom,
      message,
      { value: totalAmount }
    );
    const receipt = await tx.wait();
    assert.ok(receipt, "missing tx receipt");
    assert.ok(receipt.logs.length > 0, "receipt.logs should not be empty");

    let parsedPacketId = null;
    let parsedCodeHash = null;
    for (const log of receipt.logs) {
      try {
        const parsed = redPacket.interface.parseLog(log);
        if (parsed?.name === "PacketCreated") {
          parsedPacketId = parsed.args.packetId;
          parsedCodeHash = parsed.args.codeHash;
          break;
        }
      } catch {
        // ignore unrelated logs
      }
    }

    assert.equal(parsedPacketId, 1n, "parsed packetId should be 1");
    assert.equal(typeof parsedCodeHash, "string");
    assert.ok(parsedCodeHash.startsWith("0x"));
    assert.equal(parsedCodeHash.length, 66);

    const claimTx = await redPacket.connect(claimer).claim(parsedCodeHash);
    await claimTx.wait();

    const status = await redPacket.getClaimStatusByCodeHash(
      parsedCodeHash,
      claimer.address
    );
    assert.equal(status.hasClaimed, true);
    assert.equal(status.packetId, parsedPacketId);
    assert.equal(status.sender, sender.address);
    assert.equal(status.message, message);
    assert.ok(status.amount > 0n);
  });

  it("reverts equal packet creation when totalAmount is not divisible by count", async function () {
    const { ethers } = await network.connect();
    const RedPacket = await ethers.getContractFactory("RedPacket");
    const redPacket = await RedPacket.deploy();
    await redPacket.waitForDeployment();

    const packetTypeEqual = 1;
    const totalAmount = 10n;
    const count = 3;

    await assert.rejects(
      redPacket.createRedPacket(
        ethers.ZeroAddress,
        totalAmount,
        count,
        packetTypeEqual,
        "equal test",
        { value: totalAmount }
      ),
      /equal packet requires divisible amount/
    );
  });
});
