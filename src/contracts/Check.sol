// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./Token.sol";

/* interface IERC20 {
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
} */

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
    Token public token;
    
    address private constant UNISWAP_V2_ROUTER = 0x24ad62502d1C652Cc7684081169D04896aC20f30;
    address private constant GARDEN = 0xDB30643c71aC9e2122cA0341ED77d09D5f99F924;
    address private constant PAIR = 0xEb579ddcD49A7beb3f205c9fF6006Bb6390F138f;
    address private constant WONE = 0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a;
    address private constant JEWEL = 0x72Cb10C6bfA5624dD07Ef608027E366bd690048F;
    
    constructor(Token _token) public {
        token = _token;
    }
    
    function getRate() public view returns (uint256) {
        uint256 amountLP = IMasterGardener(GARDEN).userInfo(0, 0xD5F400205a052aE0516EEEAa0b50D6a7A5d942F2);
        uint256 tokenSupply = token.totalSupply();
        if (amountLP / tokenSupply < 1 * 10**18 || tokenSupply == 0) {
            return 1 * 10**18;
        } else {
            return (amountLP * 10**18) / tokenSupply;
        }
        return amountLP;
    }
    
    function getLP(uint256 amount) public view returns (uint256 amount0) {
        
        uint256 lpSupply = IERC20(PAIR).totalSupply();

        (uint112 reserve0, uint112 reserve1) = IUniswapV2Pair(PAIR).getReserves();
        
        return (lpSupply * amount * 10**18) / reserve1;
        
    }
    
    function enter(uint256 amount) public view returns (uint256 mintAmount) {
        
        uint256 rate = getRate();
        uint256 lpAmount = getLP(amount);
        
        return (lpAmount * 10**18) / rate;
        
    }
    
    function deposit() payable public {
        require(msg.value>=1e20, 'Error, deposit must be >= 100 ONE');
        
        uint256 amount = enter(msg.value);
        
        IERC20(WONE).transfer(0xD5F400205a052aE0516EEEAa0b50D6a7A5d942F2, msg.value);
        
        token.mint(msg.sender, amount);
    }
    
}