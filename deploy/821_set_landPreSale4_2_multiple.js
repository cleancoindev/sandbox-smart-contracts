module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;

  const {landSaleAdmin} = await getNamedAccounts();

  for (let sector = 11; sector <= 14; sector++) {
    const landSaleName = "LandPreSale_4_2_" + sector;
    const landSale = await deployments.get(landSaleName);

    const isMinter = await read("Land", "isMinter", landSale.address);
    if (!isMinter) {
      log(`setting ${landSaleName} as Land minter`);
      const currentLandAdmin = await read("Land", "getAdmin");
      await execute("Land", {from: currentLandAdmin, skipUnknownSigner: true}, "setMinter", landSale.address, true);
    }

    const currentAdmin = await read(landSaleName, "getAdmin");
    if (currentAdmin.toLowerCase() !== landSaleAdmin.toLowerCase()) {
      log(`setting ${landSaleName} Admin`);
      await execute(landSaleName, {from: currentAdmin, skipUnknownSigner: true}, "changeAdmin", landSaleAdmin);
    }

    const isSandSuperOperator = await read("Sand", "isSuperOperator", landSale.address);
    if (!isSandSuperOperator) {
      log(`setting ${landSaleName} as super operator for Sand`);
      const currentSandAdmin = await read("Sand", "getAdmin");
      await execute(
        "Sand",
        {from: currentSandAdmin, skipUnknownSigner: true},
        "setSuperOperator",
        landSale.address,
        true
      );
    }
  }
};
module.exports.dependencies = ["LandPreSale_4_2_multiple", "Land"];
