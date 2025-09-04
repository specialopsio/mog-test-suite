# MOG Token Test Suite

A comprehensive testing framework for the MOG Token smart contract built with Hardhat. This repository contains unit tests, integration tests, security tests, and gas optimization tests to ensure the contract functions correctly and securely.

## Overview

The MOG Token is an ERC20-compliant token with additional features including:
- Trading controls and restrictions
- Fee mechanisms with burn functionality  
- Ownership controls and administrative functions
- Liquidity pool interactions and swapback mechanisms
- Wallet and transaction limits

## Prerequisites

- Node.js 16+ or 18+ (LTS recommended)
- npm or yarn package manager
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/specialopsio/mog-test-suite.git
cd mog-test-suite
```

2. Install dependencies:
```bash
npm install
```

## Running Tests

### Basic Test Commands

```bash
# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run audit findings verification
npx hardhat test test/AuditFindings.test.js

# Run security tests
npx hardhat test test/Security.test.js

# Run main functionality tests
npx hardhat test test/MOGToken.test.js

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Generate coverage report
npx hardhat coverage
```

### Test Categories

- **Basic Tests**: `test/MOGToken.test.js` - Core ERC20 functionality
- **Security Tests**: `test/Security.test.js` - Access controls and security validations
- **Gas Optimization**: `test/GasOptimization.test.js` - Gas usage analysis
- **Audit Findings**: `test/AuditFindings.test.js` - Verification of security audit findings
- **Integration Tests**: `test/Integration.test.js` - Complex scenario testing (planned)

## Test Coverage

The test suite covers:

- ✅ Token deployment and initialization
- ✅ ERC20 standard compliance (transfer, approve, allowance)
- ✅ Fee calculation and distribution mechanisms  
- ✅ Ownership controls and administrative functions
- ✅ Trading restrictions and wallet limits
- ✅ Liquidity pool interactions
- ✅ Emergency functions and recovery procedures
- ✅ Gas optimization validation
- ✅ Security vulnerability prevention
- ✅ **Audit findings verification and validation**

## Audit Findings Verification

The test suite includes comprehensive verification of security audit findings:

- 🔍 **Contract Renouncement Risk** - Validates permanent ownership loss
- 🔍 **High Initial Fees** - Confirms 14x fee multipliers during trading start
- 🔍 **Fee Manipulation** - Tests owner's ability to set fees up to 49%
- 🔍 **Trading Control** - Verifies centralized trading restrictions
- 🔍 **Wallet Limits** - Confirms limit enforcement and modification
- 🔍 **Burn Mechanism** - Validates supply reduction functionality
- 🔍 **Emergency Functions** - Tests access control and functionality
- 🔍 **SafeMath Usage** - Confirms redundant safety library usage
- 🔍 **Fee Complexity** - Validates multi-variable fee calculations
- 🔍 **SwapBack Control** - Tests liquidity management controls

Run `npm run test:audit` to verify all audit findings independently.

## Project Structure

```
mog-test-suite/
├── contracts/
│   └── MOG.sol              # MOG token contract
├── test/
│   ├── MOGToken.test.js     # Main test suite
│   ├── Security.test.js     # Security-focused tests
│   ├── GasOptimization.test.js # Gas efficiency tests
│   └── Integration.test.js   # Integration tests
├── scripts/
│   └── deploy.js            # Deployment script
├── hardhat.config.js        # Hardhat configuration
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## Configuration

The test environment is configured in `hardhat.config.js` with:
- Solidity compiler version 0.8.18
- Optimizer enabled with 200 runs
- Gas reporting capabilities
- Coverage analysis

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-tests`
3. Add your tests and ensure they pass: `npm test`
4. Commit your changes: `git commit -am 'Add new tests'`
5. Push to the branch: `git push origin feature/new-tests`
6. Submit a pull request

### Writing Tests

When adding new tests:
- Follow existing naming conventions
- Include both positive and negative test cases
- Add gas consumption validations where appropriate
- Document complex test scenarios
- Ensure proper cleanup in `afterEach` hooks

## Continuous Integration

The repository includes GitHub Actions workflow (`.github/workflows/test.yml`) that:
- Runs tests on every push and pull request
- Generates coverage reports
- Validates gas usage optimization
- Checks for security vulnerabilities

## Gas Reporting

Enable gas reporting by setting the environment variable:
```bash
REPORT_GAS=true npx hardhat test
```

This will show gas consumption for each function call, helping identify optimization opportunities.

## Security Testing

The security test suite validates:
- Proper access control enforcement
- Fee manipulation prevention (max 50% limit)
- Overflow/underflow protection
- Reentrancy attack prevention
- Authorization bypass attempts

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review test documentation
3. Submit a new issue with detailed description

## License

This test suite is provided under the MIT License. See LICENSE file for details.

## Related Links

- [MOG Token Contract](https://etherscan.io/address/0xaaee1a9723aadb7afa2810263653a34ba2c21c7a)
- [Audit Report](https://github.com/specialopsio/mog-audit)
- [Project Website](https://mogcoin.com) 