const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { getBigNumber, getNumber, getBasicInfo, forkFrom } = require("../scripts/shared/utilities")
const { BigNumber } = ethers
const UniswapV2Router = require("../scripts/abis/UniswapV2Router.json")
const ERC20 = require("../scripts/abis/ERC20.json")

describe("TwapOracle and swap test", function () {
  before(async function () {
    this.basicInfo = getBasicInfo("rinkeby")
    this.MockUNO = await ethers.getContractFactory("MockUNO")
    this.MockUSDT = await ethers.getContractFactory("MockUSDT")
    this.TwapOraclePriceFeed = await ethers.getContractFactory("TwapOraclePriceFeed")
    this.TwapOraclePriceFeedFactory = await ethers.getContractFactory("TwapOraclePriceFeedFactory")
    this.signers = await ethers.getSigners()
    this.zeroAddress = ethers.constants.AddressZero
    this.routerContract = new ethers.Contract(this.basicInfo.router, JSON.stringify(UniswapV2Router.abi), ethers.provider)
  })
  beforeEach(async function () {
    this.mockUNO = await this.MockUNO.deploy()
    this.mockUSDT = await this.MockUSDT.deploy()
    const timestamp = new Date().getTime()

    await (
      await this.mockUNO
        .connect(this.signers[0])
        .approve(this.basicInfo.router, getBigNumber(10000000), { from: this.signers[0].address })
    ).wait()
    await (
      await this.mockUSDT
        .connect(this.signers[0])
        .approve(this.basicInfo.router, getBigNumber(10000000), { from: this.signers[0].address })
    ).wait()

    console.log("Adding liquidity...")

    await (
      await this.routerContract
        .connect(this.signers[0])
        .addLiquidity(
          this.mockUNO.address,
          this.mockUSDT.address,
          getBigNumber(3000000),
          getBigNumber(3000),
          getBigNumber(3000000),
          getBigNumber(3000),
          this.signers[0].address,
          timestamp,
          { from: this.signers[0].address, gasLimit: 9999999 },
        )
    ).wait()

    this.twapPriceOracleFeedFactory = await this.TwapOraclePriceFeedFactory.deploy()
  })

  describe("TwapOracle test", function () {
    beforeEach(async function () {
      await (await this.twapPriceOracleFeedFactory.newTwapOraclePriceFeed(this.mockUNO.address, this.mockUSDT.address)).wait()
      this.twapOraclePriceFeedAddr = await this.twapPriceOracleFeedFactory.getTwapOraclePriceFeed(
        this.mockUNO.address,
        this.mockUSDT.address,
      )
      this.twapOraclePriceFeed = await this.TwapOraclePriceFeed.attach(this.twapOraclePriceFeedAddr)
    })
    it("Should check TwapOracle deploy status", async function () {
      const pair = await this.twapOraclePriceFeed.token0()
      console.log("twap oracle pair", pair)
    })
    it("should convert UNO to USDT", async function () {
      const twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      const expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[initial price]", twapPrice.toString(), expectedSwapAmount.toString())

      const timestamp = new Date().getTime()
      const usdtBalanceBefore = await this.mockUSDT.balanceOf(this.signers[1].address)
      expect(usdtBalanceBefore).to.equal(0)
      await (
        await this.mockUNO
          .connect(this.signers[0])
          .approve(this.routerContract.address, getBigNumber(10000000), { from: this.signers[0].address })
      ).wait()

      const path = [this.mockUNO.address, this.mockUSDT.address]

      const tokenAmounts = await this.routerContract.getAmountsOut(getBigNumber(2000), path)

      const usdtConvert = await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokens(getBigNumber(2000), expectedSwapAmount, path, this.signers[1].address, timestamp, {
            from: this.signers[0].address,
          })
      ).wait()

      const usdtBalanceAfter = await this.mockUSDT.balanceOf(this.signers[1].address)
      expect(usdtBalanceAfter).to.equal(usdtBalanceBefore.add(tokenAmounts[1]))
    })

    it("should check getAmountsOut after multiple convert UNO to USDT", async function () {
      // we can fetch twap orcale price after one day(24 hours) once add liquidity.
      const currentDate = new Date()
      const afterOneDay = new Date(currentDate.setDate(currentDate.getDate() + 1))
      const afterOneDayTimeStampUTC = new Date(afterOneDay.toUTCString()).getTime() / 1000
      network.provider.send("evm_setNextBlockTimestamp", [afterOneDayTimeStampUTC])
      await network.provider.send("evm_mine")

      await (await this.twapOraclePriceFeed.update()).wait()

      let twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      let expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[initial price]", twapPrice.toString(), expectedSwapAmount.toString())

      const timestamp = new Date().getTime()

      await (
        await this.mockUNO
          .connect(this.signers[0])
          .approve(this.routerContract.address, getBigNumber(10000000), { from: this.signers[0].address })
      ).wait()

      const path = [this.mockUNO.address, this.mockUSDT.address]

      // The first swap
      await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokens(getBigNumber(1000), expectedSwapAmount, path, this.signers[1].address, timestamp, {
            from: this.signers[0].address,
          })
      ).wait()

      const afterTwentyHours = new Date(afterOneDay.setTime(afterOneDay.getTime() + 1000 * 3600 * 20))
      const afterTwentyHoursTimeStampUTC = new Date(afterTwentyHours.toUTCString()).getTime() / 1000
      network.provider.send("evm_setNextBlockTimestamp", [afterTwentyHoursTimeStampUTC])
      await network.provider.send("evm_mine")

      await (await this.twapOraclePriceFeed.update()).wait()

      twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[price after the first swap]", twapPrice.toString(), expectedSwapAmount.toString())

      // The second swap after 20 hours
      await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokens(getBigNumber(1000), expectedSwapAmount, path, this.signers[1].address, timestamp, {
            from: this.signers[0].address,
          })
      ).wait()

      const afterThirtyHours = new Date(afterTwentyHours.setTime(afterTwentyHours.getTime() + 1000 * 3600 * 12))
      const afterThirtyHoursTimeStampUTC = new Date(afterThirtyHours.toUTCString()).getTime() / 1000
      network.provider.send("evm_setNextBlockTimestamp", [afterThirtyHoursTimeStampUTC])
      await network.provider.send("evm_mine")

      await (await this.twapOraclePriceFeed.update()).wait()

      twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[price after the second swap]", twapPrice.toString(), expectedSwapAmount.toString())

      // The third swap after 10 hours from the second swap
      await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokens(getBigNumber(1000), expectedSwapAmount, path, this.signers[1].address, timestamp, {
            from: this.signers[0].address,
          })
      ).wait()

      await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokens(getBigNumber(1000), expectedSwapAmount, path, this.signers[1].address, timestamp, {
            from: this.signers[0].address,
          })
      ).wait()

      const afterFiftyHours = new Date(afterThirtyHours.setTime(afterThirtyHours.getTime() + 1000 * 3600 * 30))
      const afterFiftyHoursTimeStampUTC = new Date(afterFiftyHours.toUTCString()).getTime() / 1000
      network.provider.send("evm_setNextBlockTimestamp", [afterFiftyHoursTimeStampUTC])
      await network.provider.send("evm_mine")

      await (await this.twapOraclePriceFeed.update()).wait()

      twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[price after the third swap]", twapPrice.toString(), expectedSwapAmount.toString())

      // The forth swap using twap oracle price after 30 hours from the third swap
      await (
        await this.routerContract
          .connect(this.signers[0])
          .swapExactTokensForTokensSupportingFeeOnTransferTokens(
            getBigNumber(1000),
            expectedSwapAmount,
            path,
            this.signers[1].address,
            timestamp,
            { from: this.signers[0].address },
          )
      ).wait()

      const afterLastHours = new Date(afterFiftyHours.setTime(afterFiftyHours.getTime() + 1000 * 3600 * 26))
      const afterLastHoursTimeStampUTC = new Date(afterLastHours.toUTCString()).getTime() / 1000
      network.provider.send("evm_setNextBlockTimestamp", [afterLastHoursTimeStampUTC])
      await network.provider.send("evm_mine")

      await (await this.twapOraclePriceFeed.update()).wait()

      twapPrice = await this.twapOraclePriceFeed.consult(this.mockUNO.address, getBigNumber(1000))
      expectedSwapAmount = twapPrice.mul(getBigNumber(950)).div(getBigNumber(1000))
      console.log("[price after the last swap]", twapPrice.toString(), expectedSwapAmount.toString())
    })
  })
})
