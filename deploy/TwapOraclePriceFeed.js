// Defining bytecode and abi from original contract on mainnet to ensure bytecode matches and it produces the same pair code hash

module.exports = async function ({ ethers, getNamedAccounts, deployments, getChainId }) {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const owner = deployer;

  const mockUNO = await deployments.get("MockUNO");
  const mockUSDT = await deployments.get("MockUSDT");
  const uniswapFactory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  console.log(mockUNO.address, mockUSDT.address, uniswapFactory)

  await deploy('TwapOraclePriceFeed', {
    from: deployer,
    args: [uniswapFactory, mockUNO.address, mockUSDT.address],
    log: true,
    deterministicDeployment: false,
  })
}

module.exports.tags = ["TwapOraclePriceFeed", "UnoRe"]
