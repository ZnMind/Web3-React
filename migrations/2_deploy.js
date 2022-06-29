const Token = artifacts.require("Token");
const Dkp = artifacts.require("Check");

module.exports = async function(deployer) {
	//deploy Token
	await deployer.deploy(Token)

	//assign token into variable to get it's address
	const token = await Token.deployed()
	
	//pass token address for dkp contract(for future minting)
	await deployer.deploy(Dkp, token.address)

	//assign dkp contract into variable to get it's address
	const dkp = await Dkp.deployed()

	//change token's owner/minter from deployer to dkp
	await token.passMinterRole(dkp.address)
};