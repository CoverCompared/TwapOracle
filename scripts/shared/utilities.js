const { ethers } = require("hardhat")
const { BigNumber } = ethers

function getCreate2CohortAddress(actuaryAddress, { cohortName, sender, nonce }, bytecode) {
  const create2Inputs = [
    "0xff",
    actuaryAddress,
    ethers.utils.keccak256(ethers.utils.solidityPack(["address", "string", "uint"], [sender, cohortName, nonce])),
    ethers.utils.keccak256(bytecode),
  ]
  const sanitizedInputs = `0x${create2Inputs.map((i) => i.slice(2)).join("")}`

  return ethers.utils.getAddress(`0x${ethers.utils.keccak256(sanitizedInputs).slice(-40)}`)
}

// Defaults to e18 using amount * 10^18
function getBigNumber(amount, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals))
}

function getNumber(amount, decimals = 18) {
  return BigNumber.from(amount).div(BigNumber.from(10).pow(decimals)).toNumber()
}

function getPaddedHexStrFromBN(bn) {
  const hexStr = ethers.utils.hexlify(bn)
  return ethers.utils.hexZeroPad(hexStr, 32)
}

function getHexStrFromStr(str) {
  const strBytes = ethers.utils.toUtf8Bytes(str)
  return ethers.utils.hexlify(strBytes)
}

async function advanceBlock() {
  return ethers.provider.send("evm_mine", [])
}

async function advanceBlockTo(blockNumber) {
  for (let i = await ethers.provider.getBlockNumber(); i < blockNumber; i++) {
    await advanceBlock()
  }
}

const basicInfo = {
  ethereum: {
    router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },
  rinkeby: {
    router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },
  bscMain: {
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    factory: "",
  },
  bscTest: {
    router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    factory: "",
  },
}

function getBasicInfo(network) {
  return basicInfo[network]
}

module.exports = {
  getCreate2CohortAddress,
  getBigNumber,
  getNumber,
  getPaddedHexStrFromBN,
  getHexStrFromStr,
  advanceBlock,
  advanceBlockTo,
  getBasicInfo,
}
