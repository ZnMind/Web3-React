// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20 {
  address public minter;

  event MinterChanged(address indexed from, address to);

  constructor() payable ERC20("Defi Koin Project", "DKP") {
    minter = msg.sender;
  }

  function passMinterRole(address dkp) public returns (bool) {
  	require(msg.sender==minter, 'Error, only owner can change pass minter role');
  	minter = dkp;

    emit MinterChanged(msg.sender, dkp);
    return true;
  }

  function mint(address account, uint256 amount) public {
		require(msg.sender==minter, 'Error, msg.sender does not have minter role');
		_mint(account, amount);
	}

  function burn(address account, uint256 amount) public {
		require(msg.sender==minter, 'Error, msg.sender does not have minter role');
		_burn(account, amount);
	}
}