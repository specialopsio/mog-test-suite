// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// Simplified MOG contract for testing without external dependencies
contract MockMOG {
    string public constant name = "Mog Coin";
    string public constant symbol = "Mog";
    uint8 public constant decimals = 18;
    
    uint256 private _totalSupply = 420690000000000 * 10**decimals;
    address public _owner;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) internal authorizations;
    mapping(address => bool) public isexemptfromfees;
    mapping(address => bool) public isexemptfrommaxTX;
    
    uint256 public _maxTxAmount = _totalSupply / 100; // 1%
    uint256 public _maxWalletToken = _totalSupply / 100; // 1%
    uint256 public totalFee = 4; // 4%
    bool public TradingOpen = false;
    bool public swapEnabled = true;
    uint256 public swapThreshold = _totalSupply * 7 / 1000;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    constructor() {
        _owner = msg.sender;
        authorizations[_owner] = true;
        isexemptfromfees[msg.sender] = true;
        isexemptfrommaxTX[msg.sender] = true;
        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function allowance(address holder, address spender) public view returns (uint256) {
        return _allowances[holder][spender];
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transfer(address recipient, uint256 amount) public returns (bool) {
        return _transfer(msg.sender, recipient, amount);
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        if (_allowances[sender][msg.sender] != type(uint256).max) {
            require(_allowances[sender][msg.sender] >= amount, "Insufficient Allowance");
            _allowances[sender][msg.sender] -= amount;
        }
        return _transfer(sender, recipient, amount);
    }
    
    function _transfer(address sender, address recipient, uint256 amount) internal returns (bool) {
        require(_balances[sender] >= amount, "Insufficient Balance");
        
        if (!authorizations[sender] && !authorizations[recipient]) {
            require(TradingOpen, "Trading not open yet");
        }
        
        if (!authorizations[sender] && recipient != address(this) && recipient != address(0) && !isexemptfrommaxTX[recipient]) {
            require(_balances[recipient] + amount <= _maxWalletToken, "Total Holding is currently limited, you can not buy that much.");
        }
        
        require(amount <= _maxTxAmount || isexemptfrommaxTX[sender], "TX Limit Exceeded");
        
        uint256 feeAmount = 0;
        if (!isexemptfromfees[sender] && !isexemptfromfees[recipient]) {
            feeAmount = amount * totalFee / 100;
            _totalSupply -= feeAmount / 2; // Burn half
        }
        
        _balances[sender] -= amount;
        _balances[recipient] += amount - feeAmount;
        
        emit Transfer(sender, recipient, amount - feeAmount);
        if (feeAmount > 0) {
            emit Transfer(sender, address(0), feeAmount / 2); // Burn
        }
        
        return true;
    }
    
    function startTrading() public onlyOwner {
        TradingOpen = true;
    }
    
    function setParameters(uint256 _liquidityFee, uint256 _buybackFee, uint256 _marketingFee, uint256 _devFee, uint256 _burnFee, uint256 _feeDenominator) external onlyOwner {
        uint256 newTotalFee = _liquidityFee + _buybackFee + _marketingFee + _devFee + _burnFee;
        require(newTotalFee < _feeDenominator / 2, "Fees can not be more than 50%");
        totalFee = newTotalFee;
    }
    
    function removeLimits() external onlyOwner {
        _maxTxAmount = _totalSupply;
        _maxWalletToken = _totalSupply;
    }
    
    function maxWalletRule(uint256 maxWallPercent) external onlyOwner {
        require(maxWallPercent >= 1);
        _maxWalletToken = (_totalSupply * maxWallPercent) / 1000;
    }
    
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
} 