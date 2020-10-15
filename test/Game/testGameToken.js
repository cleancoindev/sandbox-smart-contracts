const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {assert, expect} = require("local-chai");
const {expectRevert, emptyBytes, checERC1155Balances} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");
const {execute} = deployments;

let assetAdmin;
let assetBouncerAdmin;
let others;
let userWithAssets;
let id;

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
const packId = 0;
const supply = 4;
const rarity = 3;

async function supplyAssets(creator) {
  await execute("Asset", {from: assetBouncerAdmin, skipUnknownSigner: true}, "setBouncer", assetAdmin, true);
  // mint some assets to a user who can then create a GAME token
  const receipt = await execute(
    "Asset",
    {from: assetAdmin, skipUnknownSigner: true},
    "mint",
    creator.address,
    packId,
    dummyHash,
    supply,
    rarity,
    creator.address,
    emptyBytes
  );
  console.log(`Blockhash: ${receipt.blockHash}`);
  return {receipt};
}

describe("GameToken", function () {
  before(async function () {
    ({assetAdmin, assetBouncerAdmin, others} = await getNamedAccounts());
    const {userWithSAND} = await setupTest();
    const {receipt} = await supplyAssets(userWithSAND);
    userWithAssets = userWithSAND;
    const assetContract = await ethers.getContract("Asset");
    const transferEvents = await findEvents(assetContract, "TransferSingle", receipt.blockHash);
    console.log(`transferEvents: ${transferEvents.length}`);
    id = transferEvents[0].args[3];

    console.log(`Token ID: ${id}`);
    const isCollection = await assetContract.isCollection(id);
    console.log(`Collection? : ${isCollection}`);
    assert.ok(isCollection);

    const balanceOf = await assetContract.balanceOf(userWithAssets.address, id);
    console.log(`balance? : ${balanceOf}`);

    expect(ownerOf).to.be.equal(userWithAssets.address);
  });
  describe("GameToken: MetaData", function () {
    let gameTokenAsAdmin;
    let gameId;

    before(async function () {
      const {gameToken} = await setupTest();
      // gameId =
    });
    it("can get the ERC721 token contract name", async function () {
      const {gameToken} = await setupTest();
      const name = await gameToken.name();
      expect(name).to.be.equal("Sandbox's GAMEs");
    });

    it("can get the ERC721 token contract symbol", async function () {
      const {gameToken} = await setupTest();
      const symbol = await gameToken.symbol();
      expect(symbol).to.be.equal("GAME");
    });

    it("should revert if ownerOf == address(0)", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.tokenURI(11), "Id does not exist");
    });

    it("should revert if not ownerOf or gameEditor", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.setTokenURI(11, "New URI"), "URI_ACCESS_DENIED");
    });

    it("GAME owner can set the tokenURI", async function () {
      const {gameToken, GameOwner} = await setupTest();
      await GameOwner.Game.setTokenURI("Hello World");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello World");
    });

    it("GAME editors can set the tokenURI", async function () {
      const {gameToken, GameEditor1} = await setupTest();
      await GameEditor1.Game.setTokenURI("Hello Sandbox");
      const URI = await gameToken.tokenURI(gameId);
      expect(URI).to.be.equal("Hello Sandbox");
    });
  });

  it("should allow the owner to add game editors", async function () {
    const {gameToken, GameOwner, GameEditor1, GameEditor2} = await setupTest();
    await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, true);
    await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, true);
    const isEditor1 = await gameToken.isGameEditor(gameId, GameEditor1.address);
    const isEditor2 = await gameToken.isGameEditor(gameId, GameEditor2.address);
    assert.ok(isEditor1);
    assert.ok(isEditor2);
  });
  it("should allow the owner to remove game editors", async function () {
    const {gameToken, GameOwner, GameEditor1, GameEditor2} = await setupTest();
    await GameOwner.Game.setGameEditor(gameId, GameEditor1.address, false);
    await GameOwner.Game.setGameEditor(gameId, GameEditor2.address, false);
    const isEditor1 = await gameToken.isGameEditor(GameEditor1.address);
    const isEditor2 = await gameToken.isGameEditor(GameEditor2.address);
    assert.notOk(isEditor1);
    assert.notOk(isEditor2);
  });

  it("should revert if non-owner trys to set Game Editors", async function () {
    const {gameToken} = await setupTest();
    const editor = others[3];
    await expectRevert(gameToken.setGameEditor(42, editor, false), "EDITOR_ACCESS_DENIED");
  });

  describe("GameToken: Minting GAMEs", function () {
    it("creator without Assets cannot mint Game", async function () {
      const {gameToken} = await setupTest();
      await expectRevert(gameToken.createGame(others[2], others[2], [], []), "INSUFFICIENT_ASSETS_SPECIFIED");
    });

    // @review finish test. Add testing for proper transfer of asset ownership, linking of game token and asset id's, all event args, etc...
    it("by default anyone can mint Games", async function () {
      const {gameToken} = await setupTest();
      const gameAsAssetOwner = gameToken.connect(gameToken.provider.getSigner(userWithAssets.address));
      await gameAsAssetOwner.createGame(others[2], others[2], [id], []);
    });

    it("minter can create GAMEs when _minter is set", async function () {});

    it("reverts if non-minter trys to mint Game when _minter set", async function () {
      const {gameTokenAsAdmin, gameToken} = await setupTest();
      await gameTokenAsAdmin.setMinter(others[7]);
      const minterAddress = await gameToken.getMinter();
      assert.equal(minterAddress, others[7]);
      await expectRevert(gameToken.createGame(others[2], others[2], [], []), "INVALID_MINTER");
    });
  });
  describe("GameToken: Modifying GAMEs", function () {
    it("Owner can add single Asset", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.addSingleAsset();
    });

    it("Owner can add multiple Assets", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.addMultipleAssets();
    });

    it("Owner can remove single Asset", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.removeSingleAsset();
    });

    it("Owner can remove multiple Assets", async function () {
      const {GameOwner} = await setupTest();
      await GameOwner.Game.removeMultipleAssets();
    });

    it("Editor can add single Asset", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.addSingleAsset();
    });

    it("Editor can add multiple Assets", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.addMultipleAssets();
    });

    it("Editor can remove single Asset", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.removeSingleAsset();
    });

    it("Editor can remove multiple Assets", async function () {
      const {GameEditor1} = await setupTest();
      await GameEditor1.Game.removeSingleAsset();
    });
  });
});
