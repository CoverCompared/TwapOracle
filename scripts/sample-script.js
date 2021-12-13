// - Mock Token
// name: USDC
// symbol: USDC

const fs = require("fs")
const { ethers } = require("hardhat")
const { BigNumber } = ethers
const hre = require("hardhat")
const { getBigNumber } = require("./shared/utilities")

const twapOraclePriceFeedDeployment = require("../deployments/bscTest/TwapOraclePriceFeed.json")

async function main() {
  const signers = await ethers.getSigners()

  const TWAP_ORACLE_PRICE_FEED_ADDRESS = twapOraclePriceFeedDeployment.address

  const TwapOraclePriceFeed = await ethers.getContractFactory("TwapOraclePriceFeed")

  // Creat twapOraclePriceFeed
  console.log("Creating TwapOraclePriceFeed...")
  const twapOraclePriceFeed = await TwapOraclePriceFeed.attach(TWAP_ORACLE_PRICE_FEED_ADDRESS)

  console.log("Writing deploy result..")
  const content = `
    TwapOraclePriceFeed: ${twapOraclePriceFeed.address},
  `
  await fs.writeFileSync("deploy.txt", content, { flag: "w+" })
  console.log("==END==")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
