// SPDX-License-Identifier: MIT
pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "./DKPToken.sol";

interface IMasterGardener {
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
    }

    struct PoolInfo {
        IERC20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. JEWEL to distribute per block.
        uint256 lastRewardBlock;  // Last block number that JEWEL distribution occurs.
        uint256 accJewelPerShare; // Accumulated JEWEL per share, times 1e12. See below.
    }

    function poolInfo(uint256 pid) external view returns (IMasterGardener.PoolInfo memory);
    function userInfo(uint256 _pid, address _user) external view returns (uint256);
    function totalAllocPoint() external view returns (uint256);
    function deposit(uint256 _pid, uint256 _amount) external;
}

interface IUniswapV2Router {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Pair {
    struct Reserves {
        uint112 reserve0;
        uint112 reserve1;
    }
    
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1);
}

contract Dkp {
    DKProtocol public token;
    address private devAddr;
    
    address private constant UNISWAP_V2_ROUTER = 0x24ad62502d1C652Cc7684081169D04896aC20f30;
    address private constant GARDEN = 0xDB30643c71aC9e2122cA0341ED77d09D5f99F924;
    address private constant PAIR = 0xEb579ddcD49A7beb3f205c9fF6006Bb6390F138f;
    
    event Deposit(address indexed user, uint256 amount, uint256 minted);

    constructor(DKProtocol _token, address _devAddr) public {
        token = _token;
        devAddr = _devAddr;
    }
    
    function getRate() public view returns (uint256) {
        uint256 amountLP = IMasterGardener(GARDEN).userInfo(0, devAddr);
        uint256 tokenSupply = token.totalSupply();
        if (amountLP / tokenSupply < 1 || tokenSupply == 0) {
            return 1 * 10**18;
        } else {
            return (amountLP * 10**18) / tokenSupply;
        }
    }
    
    function getLP(uint256 amount) public view returns (uint256) {
        uint256 lpSupply = IERC20(PAIR).totalSupply();

        (, uint256 reserve1) = IUniswapV2Pair(PAIR).getReserves();
        
        return (lpSupply * (amount / 2)) / reserve1;
    }
    
    function enter(uint256 amount) public view returns (uint256) {      
        uint256 rate = getRate();
        uint256 lpAmount = getLP(amount);
        
        return (lpAmount * 10**18) / rate;      
    }
    
    function deposit() payable public {
        require(msg.value>=1e19, 'Error, deposit must be >= 10 ONE');
        
        uint256 amount = enter(msg.value);
        uint256 devAmount = amount / 100;
        
        payable(devAddr).transfer(msg.value);
        
        token.mint(msg.sender, amount);
        token.mint(devAddr, devAmount);

        emit Deposit(msg.sender, msg.value, amount);
    }
    
}