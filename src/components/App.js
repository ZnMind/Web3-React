import './envLoad'
import { Tabs, Tab } from 'react-bootstrap'
import Dkp from '../abis/dkp.json'
import Smart from '../abis/DKPContract.json'
import Router from '../abis/Router.json'
import Factory from '../abis/Factory.json'
import Pair from '../abis/Pair.json'
import Pool from '../abis/Pool.json'
import React, { Component } from 'react';
import Token from '../abis/Token.json'
import Wone from '../abis/Wone.json'
import Gov from '../abis/DKPToken.json'
import Hero from '../abis/Hero.json'
import Quest from '../abis/Quest.json'
import Web3 from 'web3';
import './App.css';

//establishing normal contracts
const web3 = new Web3("https://harmony-0-rpc.gateway.pokt.network")
const router = new web3.eth.Contract(Router.abi, '0x24ad62502d1C652Cc7684081169D04896aC20f30')
const factory = new web3.eth.Contract(Factory.abi, '0x9014B937069918bd319f80e8B3BB4A2cf6FAA5F7')
const pool = new web3.eth.Contract(Pool.abi, '0xDB30643c71aC9e2122cA0341ED77d09D5f99F924')
const wone = new web3.eth.Contract(Wone.abi, '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a')
const token0 = new web3.eth.Contract(Token.abi, '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F')
const smart = new web3.eth.Contract(Smart.abi, '0x837C626dF66Ab6179143bdB18D1DD1a2618aE7e6')
const govToken = new web3.eth.Contract(Gov.abi, '0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F')
const lpToken = new web3.eth.Contract(Token.abi, '0xEb579ddcD49A7beb3f205c9fF6006Bb6390F138f')
const hero = new web3.eth.Contract(Hero.abi, '0x5F753dcDf9b1AD9AabC1346614D1f4746fd6Ce5C')
const quest = new web3.eth.Contract(Quest.abi, '0x5100bd31b822371108a0f63dcfb6594b9919eaf4')
const lpOD = new web3.eth.Contract(Pair.abi, '0x3db1f3220d41E0d8076E7303A6cAD67Fb2d2C912')

//establishing websockets contracts
const ws3 = new Web3("wss://ws.s0.t.hmny.io")
const wsJDLP = new ws3.eth.Contract(Pair.abi, '0x8766079a62Ea0bd58cb3fD98C006A9321C3009c6')
const wsgovToken = new ws3.eth.Contract(Gov.abi, '0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F')

//addresses
const devAddr = '0xD5F400205a052aE0516EEEAa0b50D6a7A5d942F2'
const privateKey = ''

const accountObj = {}
let txQueue = []
const heroId = [
  {
    id: '188566',
    timeout: false
  },
  {
    id: '193996',
    timeout: false
  },
  {
    id: '214308',
    timeout: false
  },
]

//using websockets to listen to Transfers
wsgovToken.events.Transfer({fromBlock: 0}, (err, data) => {
  if(!err) {
    console.log(data)
  }
})
web3.eth.getBlockNumber().then(console.log)

class App extends Component {

  async componentDidMount() {
    await this.loadBlockchainData(this.props.dispatch)
    //listening to Sync event on the liquidity pool
    wsJDLP.events.Sync({fromBlock: 0}, (err, data) => {
      if(!err) {
        console.log(`Dkp: ${data.returnValues[0]}\nJwl: ${data.returnValues[1]}\nDkp per Jwl: ${data.returnValues[0] / data.returnValues[1]}`)
        this.watchEvent(data.returnValues[0], data.returnValues[1])
      }
    })
  }

  async loadBlockchainData(dispatch) {
    if (typeof window.ethereum !== 'undefined') {
      const web3 = new Web3(window.ethereum)
      const netId = await web3.eth.net.getId()
      const accounts = await web3.eth.getAccounts()
      if (document.querySelector('.enableEthereumButton') !== null) {
        const ethereumButton = document.querySelector('.enableEthereumButton')
        ethereumButton.addEventListener('click', () => {
          ethereumButton.disabled = true
          this.getAccount()
        })
      }

      //load balance
      if (typeof accounts[0] !== 'undefined') {
        const balance = await web3.eth.getBalance(accounts[0])
        console.log("One Amount: " + web3.utils.fromWei(balance.toString()))
        const jAmount = await token0.methods.balanceOf(devAddr).call()
        console.log("Jewel Amount: " + web3.utils.fromWei(jAmount.toString()))
        const user = await pool.methods.userInfo(0, devAddr).call()
        console.log("Pool Amount: " + web3.utils.fromWei(user[0]))
        const dkpSupply = await govToken.methods.totalSupply().call()
        console.log("Dkp Supply: " + web3.utils.fromWei(dkpSupply.toString()))
        const pend = await pool.methods.pendingReward(0, devAddr).call()
        console.log("Pending: " + web3.utils.fromWei(pend))
        var minutes = new Date().getTime()
        minutes = (minutes - Math.floor(minutes / 28800000) * 28800000) / 60000
        console.log("Rewards / minute: " + web3.utils.fromWei(pend.toString()) / minutes)
        this.setState({ account: accounts[0], balance: balance, web3: web3 })
        this.getMilli()
      } else {
        window.alert('Please login with MetaMask')
      }

      //load contracts
      try {
        const token = new web3.eth.Contract(Token.abi, Token.networks[netId].address)
        const dkp = new web3.eth.Contract(Dkp.abi, Dkp.networks[netId].address)
        const dkpAddress = Dkp.networks[netId].address
        this.setState({ token: token, dkp: dkp, dkpAddress: dkpAddress })
      } catch (e) {
        console.log('Error', e)
        window.alert('Contracts not deployed to the current network')
      }

    } else {
      window.alert('Please install MetaMask')
    }
  }

  async getAccount() {
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    this.componentDidMount()
  }

  async watchEvent(dkp, jwl) {
    //checking reserves of pools for arbitrage opportunities
    console.log("Watching...")
    const mint = await smart.methods.enter(web3.utils.toWei('1')).call()
    let opd = 1 / web3.utils.fromWei(mint.toString())
    let dpj = dkp / jwl
    console.log(opd)
    console.log(opd * dpj)

    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    console.log(`${reserves[0]} \n${reserves[1]} \n${reserves[1] / reserves[0]}`)
  }

  async getMilli() {
    //setting up a timeout to run every 8 hours
    var currentTime = new Date().getTime()
    var currentDate = new Date(currentTime)
    console.log("Current time: " + currentDate)
    var timeOut = 28800000 - (currentTime - (Math.floor(currentTime / 28800000) * 28800000))
    console.log("Next rebase time: " + new Date(currentTime + timeOut))

    await new Promise(resolve => setTimeout(resolve, timeOut))
    this.claimRewards()
  }

  //This section is for sending out our NFT heroes on quests to increase yield
  async startTimeout(i, ms) {
    heroId[i].timeout = true
    console.log(`Current time: ${new Date(new Date().getTime())}\nStart timeout Hero ${i + 1}: ${ms / 60000} minutes`)
    await new Promise(resolve => setTimeout(() => {
      if (!txQueue.includes(heroId[i])) {
        txQueue.push(heroId[i])
        console.log(`Queue: ${txQueue}`)
      }
      if (txQueue[0] !== heroId[i]) {
        this.starTimeout(i, 5000)
      } else {
        this.questing(i)
        txQueue = txQueue.slice(1)
        heroId[i].timeout = false
        resolve();
      }
    }, ms))
  }

  async finishTimeout(i, ms) {
    heroId[i].timeout = true
    console.log(`Current time: ${new Date(new Date().getTime())}\nFinish timeout Hero ${i + 1}: ${ms / 60000} minutes`)
    await new Promise(resolve => setTimeout(() => {
      if (!txQueue.includes(heroId[i])) {
        txQueue.push(heroId[i])
        console.log(`Queue: ${txQueue}`)
      }
      if (txQueue[0] !== heroId[i]) {
        this.finishTimeout(i, 5000)
      } else {
        this.finishQuesting(i)
        txQueue = txQueue.slice(1)
        heroId[i].timeout = false
        resolve();
      }
    }, ms))
  }

  async getterHeroes() {
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    for (let i = 0; i < heroId.length; i++) {
      let myHero = await hero.methods.getHero(heroId[i].id).call()
      let currentTime = new Date().getTime()
      heroId[i].maxStam = myHero[4][10]
      heroId[i].maxStamTime = myHero[3][0] * 1000

      if (myHero[3][5] !== zeroAddress) {
        heroId[i].questing = true
        let status = await quest.methods.getHeroQuest(heroId[i].id).call()
        heroId[i].start = status[4] * 1000
        heroId[i].finish = status[6] * 1000
        heroId[i].stamUsed = (heroId[i].finish - heroId[i].start) / 600000
      } else {
        heroId[i].questing = false

        if (currentTime >= heroId[i].maxStamTime) {
          heroId[i].maxStamTime = 0
          heroId[i].currentStam = heroId[i].maxStam
        } else {
          heroId[i].currentStam = heroId[i].maxStam - Math.ceil(((heroId[i].maxStamTime) - currentTime) / 1200000)
        }

        if (heroId[i].currentStam < 15) {
          heroId[i].time15 = heroId[i].maxStamTime - ((heroId[i].maxStam - 15) * 1200000)
        }
      }
    }
    this.settingTimeout()
  }

  async settingTimeout() {
    let currentTime = new Date().getTime()

    for (let i = 0; i < heroId.length; i++) {

      if (heroId[i].timeout === false) {
        if (heroId[i].questing === true) {
          heroId[i].finishTimeout = (heroId[i].finish - currentTime) + 10000
          if (heroId[i].finishTimeout <= 0) {
            this.finishTimeout(i, 5000 * i)
          } else {
            this.finishTimeout(i, heroId[i].finishTimeout)
          }
        } else {
          if (heroId[i].currentStam < 15) {
            heroId[i].startTimeout = (heroId[i].time15 + 5000) - currentTime
            this.startTimeout(i, heroId[i].startTimeout)
          } else {
            this.startTimeout(i, 5000 * i)
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    console.log(heroId)
  }

  async questing(i) {
    const gardening = '0xe4154B6E5D240507F9699C730a496790A722DF19'

    console.log("Sending hero " + heroId[i].id)
    const start = quest.methods.startQuest([heroId[i].id], gardening, 1).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x5100bd31b822371108a0f63dcfb6594b9919eaf4',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: start
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    const status = await quest.methods.getHeroQuest(heroId[i].id).call()
    heroId[i].start = status[4] * 1000
    heroId[i].finish = status[6] * 1000

    console.log(`Quest started at: ${new Date(heroId[i].start)}\nQuest finished at: ${new Date(heroId[i].finish)}`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    this.getterHeroes()
  }

  async finishQuesting(i) {
    console.log("Finishing quest...")
    let jBefore = await token0.methods.balanceOf(devAddr).call()

    const tx = await quest.methods.completeQuest(heroId[i].id).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x5100bd31b822371108a0f63dcfb6594b9919eaf4',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: tx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    let jAfter = await token0.methods.balanceOf(devAddr).call()
    let jGain = (jAfter - jBefore)
    console.log(`${heroId[i].id} gained ${web3.utils.fromWei(jGain.toString())} jewel using ${heroId[i].stamUsed} stamina`)
    //console.log("Hero " + id + " gained " + web3.utils.fromWei((jAfter - jBefore).toString()) + " jewel")
    await new Promise(resolve => setTimeout(resolve, 2000))
    this.getterHeroes()
  }

  //This section is for finding any arbitrage opportunities between the WONE LP and our minting smart contract
  async quadratic(a, b, c) {
    return (-b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a)
  }

  async constantProduct(reserve0, reserve1, mint) {
    let swapRate = reserve1 / reserve0
    let mintRate = (1 / mint)
    let constant = reserve0 * reserve1

    //We know r1/r0 = rate & r1*r0 = constant
    //Therefore for rate to equal mint r0 = sqrt(constant/mint)
    let cpr0 = Math.sqrt(constant / mintRate)

    console.log("Swap: " + swapRate)
    console.log("Mint: " + mintRate)
    console.log("CPR0: " + cpr0)

    return cpr0 - reserve0
  }

  async getArbitrage() {
    const mint = await smart.methods.enter(web3.utils.toWei('1')).call()
    const reserves = await lpOD.methods.getReserves().call()
    console.log(web3.utils.fromWei(mint.toString()))
    console.log(reserves)

    let cpr0 = await this.constantProduct(
      web3.utils.fromWei(reserves[0].toString()),
      web3.utils.fromWei(reserves[1].toString()),
      web3.utils.fromWei(mint.toString())
    )
    if(cpr0 >= 10) {
      this.swapArb(web3.utils.toWei(cpr0.toString()))
    }
    console.log(cpr0)
  }

  async swapArb(amount) {
    let dkpBefore = await govToken.methods.balanceOf(devAddr)
    this.setState({ dkpB: dkpBefore})
    console.log(`Swap ${web3.utils.fromWei(amount.toString())} Dkp for One`)
    let path = ['0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F', '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a']
    const reserves = await lpOD.methods.getReserves().call()
    console.log(reserves)

    let dkpPerOne = await router.methods.getAmountOut(amount.toString(), reserves[0], reserves[1]).call()
    console.log("Get Amount One: " + web3.utils.fromWei(dkpPerOne.toString()))
    dkpPerOne = dkpPerOne * 0.97

    const tx = await router.methods.swapExactTokensForTokens(
      amount.toString(),
      dkpPerOne.toString(),
      path,
      devAddr,
      web3.utils.toWei('60000')
    ).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: tx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    this.unwrapWone(dkpPerOne)
  }

  async unwrapWone(amount) {
    let woneBalance = await wone.methods.balanceOf(devAddr).call()
    console.log("Unwrap wone: " + woneBalance)
    if(woneBalance > 0) {
      const tx = await wone.methods.withdraw(woneBalance).encodeABI()

      const rawTx = {
        nonce: await web3.eth.getTransactionCount(devAddr),
        //value: amount,
        from: devAddr,
        to: '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a',
        gasPrice: await web3.eth.getGasPrice(),
        gasLimit: 2100000,
        data: tx
      }

      const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

      const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

      console.log(sentTx)
    }
    this.depositArb(amount)
  }

  async depositArb(amount) {
    console.log(`Mint dkp with ${web3.utils.fromWei(amount.toString())} One`)

    const tx = smart.methods.deposit().encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      value: amount,
      from: devAddr,
      to: '0x837C626dF66Ab6179143bdB18D1DD1a2618aE7e6',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: tx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    let dkpAfter = await govToken.methods.balanceOf(devAddr)
    this.setState({ dkpA: dkpAfter})
    console.log(`Dkp gained: ${this.state.dkpB - this.state.dkpA}`)
  }

  async dkp() {
    const rate = await smart.methods.getRate().call()
    const lp = await smart.methods.getLP(web3.utils.toWei('10')).call()
    const mint = await smart.methods.enter(web3.utils.toWei('10')).call()

    console.log("Rate: " + web3.utils.fromWei(rate))
    console.log("LP: " + web3.utils.fromWei(lp))
    console.log("Minted: " + web3.utils.fromWei(mint))

    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    const onePerJwl = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    const JperD = await smart.methods.enter(onePerJwl).call()
    console.log("Jewel per DKP: " + web3.utils.fromWei(JperD.toString()))
  }

  //This section is for claiming rewards from the LP. It runs every 8 hours
  async claimRewards() {
    const pend = await pool.methods.pendingReward(0, devAddr).call()
    console.log("Pending: " + web3.utils.fromWei(pend))

    if (web3.utils.fromWei(pend) >= 0.5) {
      const claim = await pool.methods.claimReward(0).encodeABI()

      const rawTx = {
        nonce: await web3.eth.getTransactionCount(devAddr),
        from: devAddr,
        to: '0xDB30643c71aC9e2122cA0341ED77d09D5f99F924',
        gasPrice: await web3.eth.getGasPrice(),
        gasLimit: 2100000,
        data: claim
      }

      const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

      const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

      console.log(sentTx)
      console.log("Claimed: " + web3.utils.fromWei(pend) + " jewel.")
    }
    this.check()
  }

  async check() {
    //const accounts = await web3.eth.getAccounts()
    const balance = await web3.eth.getBalance(devAddr)
    this.setState({ account: devAddr, balance: balance })

    const jewelBalance = await token0.methods.balanceOf(devAddr).call()
    accountObj.one = web3.utils.fromWei(this.state.balance.toString())
    console.log("One amount: " + accountObj.one)
    accountObj.jewel = web3.utils.fromWei(jewelBalance.toString())
    console.log("Jewel Amount: " + web3.utils.fromWei(jewelBalance.toString()))

    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    const user = await pool.methods.userInfo(0, devAddr).call()
    console.log("Pool Amount: " + web3.utils.fromWei(user[0]))

    const onePerJwl = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    accountObj.onePerJwl = web3.utils.fromWei(onePerJwl.toString())
    console.log("One per Jewel: " + accountObj.onePerJwl)

    const mint = await smart.methods.enter(onePerJwl).call()
    console.log("Jewel per DKP: " + web3.utils.fromWei(mint.toString()))

    if(web3.utils.fromWei(jewelBalance.toString()) >= 0.5) {
      this.swapJwlDkp(jewelBalance * 0.2)
    } else if(web3.utils.fromWei(balance.toString()) >= 10) {
      const oneToSwap = ((accountObj.one - 1) - (accountObj.jewel * accountObj.onePerJwl)) / 2
      this.swapOne(oneToSwap, 'One')
    }
  }

  async swapJwlDkp(amount) {
    console.log(`Swap ${web3.utils.fromWei(amount.toString())} Jewel for Dkp`)
    let path = ['0x72Cb10C6bfA5624dD07Ef608027E366bd690048F', '0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F']
    const pair = new web3.eth.Contract(Pair.abi, '0x8766079a62Ea0bd58cb3fD98C006A9321C3009c6')
    const reserves = await pair.methods.getReserves().call()
    console.log(reserves)

    let jwlPerDkp = await router.methods.getAmountOut(amount.toString(), reserves[1], reserves[0]).call()
    console.log("Get Amount Dkp: " + web3.utils.fromWei(jwlPerDkp.toString()))
    jwlPerDkp = jwlPerDkp * 0.97

    const tx = await router.methods.swapExactTokensForTokens(
      amount.toString(),
      jwlPerDkp.toString(),
      path,
      devAddr,
      web3.utils.toWei('60000')
    ).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: tx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    //const dkpBalance = await govToken.methods.balanceOf(devAddr).call()

    let interest = jwlPerDkp / 2
    console.log(jwlPerDkp + " " + interest)

    this.payInterest(interest)
  }

  async payInterest(interest) {
    const payInt = await govToken.methods.transfer('0xEF356871b5ad2e1457C832ABC0B06173A33a9B8C', interest.toString()).encodeABI()

    const rawPay = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 210000,
      data: payInt
    }

    const signedPay = await web3.eth.accounts.signTransaction(rawPay, privateKey)

    const sentPay = await web3.eth.sendSignedTransaction(signedPay.rawTransaction)

    console.log(sentPay)

    this.addLPJD(interest)
  }

  async addLPJD(amount) {
    console.log(`ADD LP J <> D ${amount}`)
    const pair = new web3.eth.Contract(Pair.abi, '0x8766079a62Ea0bd58cb3fD98C006A9321C3009c6')
    const reserves = await pair.methods.getReserves().call()

    //const govBalance = await govToken.methods.balanceOf(devAddr).call()

    //const dkpPerJwl = await router.methods.getAmountOut(govBalance.toString(), reserves[1], reserves[0]).call()
    console.log("Add Amount Dkp: " + web3.utils.fromWei(amount.toString()))
    const jwlPerDkp = await router.methods.getAmountOut(amount.toString(), reserves[0], reserves[1]).call()
    console.log("Add Amount Jwl: " + web3.utils.fromWei(jwlPerDkp.toString()))

    let jMin = jwlPerDkp * 0.97
    let dMin = amount * 0.97

    const addTx = await router.methods.addLiquidity(
      '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F',
      '0x1DF82Bfb54A8134Fd34A02E51Af788d97b072a7F',
      jwlPerDkp.toString(),
      amount.toString(),
      jMin.toString(),
      dMin.toString(),
      devAddr,
      web3.utils.toWei('60000')
    ).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: addTx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    const jewelBalance = await token0.methods.balanceOf(devAddr).call()
    accountObj.jewel = web3.utils.fromWei(jewelBalance.toString())
    console.log("Jewel Amount: " + accountObj.jewel)

    if (accountObj.one > 10 || accountObj.jewel > 1) {
      if (accountObj.one > (accountObj.jewel * accountObj.onePerJwl)) {
        console.log(accountObj.one)
        const oneToSwap = ((accountObj.one - 1) - (accountObj.jewel * accountObj.onePerJwl)) / 2
        console.log(oneToSwap)
        this.swapOne(oneToSwap, 'One')
      } else {
        console.log(accountObj.jewel)
        const jwlToSwap = (accountObj.jewel - (accountObj.one / accountObj.onePerJwl)) / 1.9
        console.log(jwlToSwap)
        this.swapOne(jwlToSwap, 'Jwl')
      }
    }
  }

  async swapOne(amount, token) {
    console.log(`SWAP ${token}`)
    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    let path = []
    if (token === 'One') {

      path = ['0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a', '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F']
      console.log(amount + " " + path)
      let jwlPerOne = await router.methods.getAmountOut(web3.utils.toWei(amount.toString()), reserves[1], reserves[0]).call()
      jwlPerOne = web3.utils.fromWei(jwlPerOne.toString()) * 0.99
      console.log("Get Amount Jwl: " + jwlPerOne)

      const tx = await router.methods.swapExactETHForTokens(
        web3.utils.toWei(jwlPerOne.toString()),
        path,
        devAddr,
        web3.utils.toWei('60000')
      ).encodeABI()

      const rawTx = {
        nonce: await web3.eth.getTransactionCount(devAddr),
        from: devAddr,
        to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
        value: web3.utils.toWei(amount.toString()),
        gasPrice: await web3.eth.getGasPrice(),
        gasLimit: 2100000,
        data: tx
      }

      const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

      const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

      console.log(sentTx)

    } else {
      path = ['0x72Cb10C6bfA5624dD07Ef608027E366bd690048F', '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a']
      console.log(amount + " " + path)
      let onePerJwl = await router.methods.getAmountOut(web3.utils.toWei(amount.toString()), reserves[0], reserves[1]).call()
      onePerJwl = web3.utils.fromWei(onePerJwl.toString()) * 0.99
      console.log("Get Amount One: " + onePerJwl)

      const tx = await router.methods.swapExactTokensForETH(
        web3.utils.toWei(amount.toString()),
        web3.utils.toWei(onePerJwl.toString()),
        path,
        devAddr,
        web3.utils.toWei('60000'),
      ).encodeABI()

      const rawTx = {
        nonce: await web3.eth.getTransactionCount(devAddr),
        from: devAddr,
        to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
        gasPrice: await web3.eth.getGasPrice(),
        gasLimit: 2100000,
        data: tx
      }

      const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

      const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

      console.log(sentTx)
    }




    /* const tx = await router.methods.swapExactETHForTokens(
      web3.utils.toWei(amount.toString(), 'ether'),  
      path, 
      this.state.account, 
      web3.utils.toWei('60000', 'ether'))
      .send({value: web3.utils.toWei('15', 'ether'), from: this.state.account, gas: 2100000})
    console.log(tx) */
    console.log("LP Pair: " + pair)
    console.log("Reserve Jewel: " + web3.utils.fromWei(reserves[0]))
    console.log("Reserve Wone: " + web3.utils.fromWei(reserves[1]))

    const pend = await pool.methods.pendingReward(0, devAddr).call()
    console.log("Pending: " + web3.utils.fromWei(pend))

    const out = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    console.log("Get Amount Wone: " + web3.utils.fromWei(`${out}`))

    this.addLP()
  }

  async addLP() {
    console.log("ADD LP J <> O")
    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    const onePerJwl = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    console.log("Get Amount Wone: " + web3.utils.fromWei(onePerJwl.toString()))
    const jwlPerOne = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[1], reserves[0]).call()
    console.log("Get Amount Jwl: " + web3.utils.fromWei(jwlPerOne.toString()))
    const quote = await router.methods.quote(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    console.log("Get Amount Wone: " + web3.utils.fromWei(`${quote}`))

    const jewelBalance = await token0.methods.balanceOf(devAddr).call()
    //const oneBalance = await web3.eth.getBalance(devAddr)
    const jewelMin = web3.utils.fromWei(jewelBalance.toString()) * 0.99
    const oneMin = web3.utils.fromWei(jewelBalance.toString()) * web3.utils.fromWei(onePerJwl.toString()) * 0.99
    const oneAmount = web3.utils.fromWei(quote.toString()) * web3.utils.fromWei(jewelBalance.toString())

    console.log(jewelBalance)
    console.log(jewelMin)
    console.log(oneMin)
    console.log(oneAmount)

    /* const addTx = await router.methods.addLiquidityETH(
      '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F',
      jewelBalance,
      web3.utils.toWei(jewelMin.toString()),
      web3.utils.toWei(oneMin.toString()),
      this.state.account,
      web3.utils.toWei('60000', 'ether')
    ).send({ value: web3.utils.toWei(oneAmount.toString()), from: this.state.account, gas: 2100000 })
    console.log(addTx) */

    const addTx = await router.methods.addLiquidityETH(
      '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F',
      jewelBalance,
      web3.utils.toWei(jewelMin.toString()),
      web3.utils.toWei(oneMin.toString()),
      devAddr,
      web3.utils.toWei('60000', 'ether')
    ).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0x24ad62502d1C652Cc7684081169D04896aC20f30',
      value: web3.utils.toWei(oneAmount.toString()),
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: addTx
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    this.depositLP()
  }

  async removeLP(liquidity) {
    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    const onePerJwl = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    console.log("Get Amount Wone: " + web3.utils.fromWei(onePerJwl.toString()))
    const jwlPerOne = await router.methods.getAmountOut(web3.utils.toWei('1', 'ether'), reserves[1], reserves[0]).call()
    console.log("Get Amount Jwl: " + web3.utils.fromWei(jwlPerOne.toString()))
    const quote = await router.methods.quote(web3.utils.toWei('1', 'ether'), reserves[0], reserves[1]).call()
    console.log("Get Amount Wone: " + web3.utils.fromWei(`${quote}`))

    const totalLP = await pair.methods.totalSupply().call()
    console.log(web3.utils.fromWei(totalLP.toString()))
    const liqMinOne = (liquidity / web3.utils.fromWei(totalLP.toString())) * web3.utils.fromWei(reserves[1]) * 0.99
    const liqMinJwl = (liquidity / web3.utils.fromWei(totalLP.toString())) * web3.utils.fromWei(reserves[0]) * 0.99
    console.log(liqMinOne + "     " + liqMinJwl)

    /* const removeTx = await router.methods.removeLiquidityETH(
      '0x72Cb10C6bfA5624dD07Ef608027E366bd690048F',
      web3.utils.toWei(liquidity.toString()),
      web3.utils.toWei(liqMinJwl.toString()),
      web3.utils.toWei(liqMinOne.toString()),
      this.state.account,
      web3.utils.toWei('60000')
    ).send({ from: this.state.account, gas: 2100000 })
    console.log(removeTx) */


  }

  async depositLP() {
    console.log("DEPOSIT")
    const poolAddress = await factory.methods.allPairs(0).call()
    const lpBalance = await lpToken.methods.balanceOf(devAddr).call()
    console.log(web3.utils.fromWei(lpBalance.toString()))

    /* const depositMG = await pool.methods.deposit(0, web3.utils.toWei('1', 'ether'), poolAddress).send({ from: this.state.account, gas: 2100000 })
    console.log(depositMG) */

    const depositMG = await pool.methods.deposit(0, lpBalance, poolAddress).encodeABI()

    const rawTx = {
      nonce: await web3.eth.getTransactionCount(devAddr),
      from: devAddr,
      to: '0xDB30643c71aC9e2122cA0341ED77d09D5f99F924',
      gasPrice: await web3.eth.getGasPrice(),
      gasLimit: 2100000,
      data: depositMG
    }

    const signedTx = await web3.eth.accounts.signTransaction(rawTx, privateKey)

    const sentTx = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)

    console.log(sentTx)

    const user = await pool.methods.userInfo(0, devAddr).call()
    console.log("Pool Amount: " + web3.utils.fromWei(user[0]))

    this.getMilli()
  }

  async withdrawLP(amount) {
    const poolAddress = await factory.methods.allPairs(0).call()

    const withdrawMG = await pool.methods.withdraw(0, web3.utils.toWei(amount.toString(), 'ether'), poolAddress).send({ from: this.state.account, gas: 2100000 })
    console.log(withdrawMG)
  }


  async swapJwl(amount) {
    const poolAddress = await factory.methods.allPairs(0).call()
    const pair = new web3.eth.Contract(Pair.abi, poolAddress)
    const reserves = await pair.methods.getReserves().call()

    const oneMin = await router.methods.getAmountOut(web3.utils.toWei(amount.toString()), reserves[0], reserves[1]).call()

    const tx = await router.methods.swapExactTokensForETH(
      web3.utils.toWei(amount.toString()),
      oneMin,
      ['0x72Cb10C6bfA5624dD07Ef608027E366bd690048F', '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a'],
      this.state.account,
      web3.utils.toWei('60000', 'ether'))
      .send({ from: this.state.account, gas: 210000 })
    console.log(tx)
  }

  async deposit(amount) {
    if (this.state.dkp !== 'undefined') {
      try {
        const web3 = new Web3(window.ethereum)
        await smart.methods.deposit().send({
          nonce: await web3.eth.getTransactionCount(this.state.account),
          from: this.state.account,
          to: '0x837C626dF66Ab6179143bdB18D1DD1a2618aE7e6',
          value: web3.utils.toWei(amount.toString()),
          gasPrice: await web3.eth.getGasPrice(),
          gasLimit: 210000
        })
        //await this.state.dkp.methods.enter(web3.utils.toWei(amount.toString(), 'ether')).send({ from: this.state.account, gas: 2100000 })
      } catch (e) {
        console.log('Error, deposit: ', e)
      }
    }
  }

  async leave(amount) {
    //e.preventDefault()
    if (this.state.dkp !== 'undefined') {
      try {
        await this.state.dkp.methods.leave(amount).send({ value: amount, from: this.state.account })
      } catch (e) {
        console.log('Error, withdraw: ', e)
      }
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      web3: 'undefined',
      account: '',
      token: null,
      dkp: null,
      balance: 0,
      dkpAddress: null,
      dkpB: 0,
      dkpA: 0
    }
  }

  render() {
    return (
      <div className='text-monospace'>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-1 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href="https://dkprotocol.github.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            <b>DKP</b>
          </a>
          <div className="align-items-center">
            <b>One: {Math.floor(web3.utils.fromWei(this.state.balance.toString()) * 100) / 100}</b>
          </div>
          <div className="align-items-center">
            <b>{this.state.account === "" ?
              <button className="enableEthereumButton btn btn-success">Connect</button> :
              this.state.account
            }</b>
          </div>
        </nav>
        <div className="container-fluid mt-5 text-center">
          <br></br>
          <h1>DK Protocol</h1>
          <h2>{this.state.account}</h2>
          <br></br>
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">

                <button onClick={() => this.getArbitrage()}> Arbitrage </button>
                <button onClick={() => this.getterHeroes()}> Heroes </button>
                <button onClick={() => this.swapJwlDkp("1000000000000000000")}> Swap JD </button>
                <button onClick={() => this.payInterest("1000000000000000000")}> Pay Int </button>
                <button onClick={() => this.questing()}> Start Quest </button>
                <button onClick={() => this.dkp()}> Smart Contract </button>
                <button onClick={() => this.claimRewards()}> Claim Rewards </button>
                <button onClick={() => this.swapOne()}> Swap One </button>
                <button onClick={() => this.swapJwl(0.5)}> Swap Jwl </button>
                <button onClick={() => this.check()}> Check </button>
                <button onClick={() => this.addLP()}> Add LP </button>
                <button onClick={() => this.removeLP(1)}> Remove LP </button>
                <button onClick={() => this.depositLP()}> Deposit LP </button>
                <button onClick={() => this.withdrawLP(1)}> Withdraw LP </button>

                <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
                  <Tab eventKey="enter" title="Enter">
                    <div>
                      <br></br>
                      How much do you want to swap?
                      <br></br>
                      (min. amount is 10 ONE)
                      <br></br>
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        let amount = this.depositAmount.value
                        this.deposit(amount)
                      }}>
                        <div className='form-group mr-sm-2'>
                          <br></br>
                          <input
                            id='depositAmount'
                            step="0.01"
                            type='number'
                            ref={(input) => { this.depositAmount = input }}
                            className="form-control form-control-md"
                            placeholder='amount...'
                            required />
                        </div>
                        <button onClick={() => this.dkp()} className='btn btn-primary mr-2'>Get Rate</button>
                        <button type='submit' className='btn btn-primary'>Swap One</button>
                      </form>

                    </div>
                  </Tab>
                  <Tab eventKey="withdraw" title="Withdraw">
                    <br></br>
                    Do you want to withdraw + take interest?
                    <br></br>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      let amount = this.depositAmount.value
                      amount = amount * 10 ** 18 //convert to wei
                      this.withdraw(amount)
                    }}></form>
                    <br></br>
                    <div>
                      <button type='submit' className='btn btn-primary' onClick={(e) => this.withdraw(e)}>WITHDRAW</button>
                    </div>
                  </Tab>
                  
                </Tabs>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
