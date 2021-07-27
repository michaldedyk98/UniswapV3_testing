// SPDX-License-Identifier: Unlicense

pragma solidity >=0.6.0 <0.9.0;

interface IUniswapBooster {
    /**
     * @notice Emitted on successful deposit to uniswap
     * @param sender Address of depositing account
     * @param tokenId0 token id of position in pool
     * @param tokenId1 token id of position in uniswap booster contract
     * @param amount0 number of total token0 deposited
     * @param amount1 number of total token1 deposited
     */
    event Deposit(
        address indexed sender,
        uint256 tokenId0,
        uint256 tokenId1,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @notice Emitted on successful deposit of NFT token of uniswap v3 pool position
     * @param sender Address of depositing account
     * @param tokenId0 token id of position in pool
     * @param tokenId1 token id of position in uniswap booster contract
     */
    event DepositNFT(
        address indexed sender,
        uint256 tokenId0,
        uint256 tokenId1
    );

    /**
     * @notice Emitted on successful withdraw
     * @param sender Address of withdrawing account
     * @param sender Address of account receiving tokens
     * @param tokenId0 token id of position in pool
     * @param tokenId1 token id of position in uniswap booster contract
     * @param amount0 number of total token0 withdrawn
     * @param amount1 number of total token1 withdrawn
     * @param feeAmount0 value of token0 fees withdrawn
     * @param feeAmount1 value of token1 fees withdrawn
     */
    event Withdraw(
        address indexed sender,
        address indexed to,
        uint256 tokenId0,
        uint256 tokenId1,
        uint256 amount0,
        uint256 amount1,
        uint256 feeAmount0,
        uint256 feeAmount1
    );

    // details about the position in uniswap booster
    struct BoosterPosition {
        // token id in uniswap pool
        uint256 tokenId;
        // the address that is approved for spending booster token
        address operator;
        // // the ID of the pool with which this token is connected
        // uint80 poolId;
        // Current shares
        uint8 shares;
        // Amount of token0 transfered from sender
        uint256 token0;
        // Amount of token1 transfered from sender
        uint256 token1;
    }

    struct BurnAndCollectParams {
        uint256 boosterTokenId;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }

    function depositNFT(uint256 tokenId)
        external
        returns (
            uint256 boosterTokenId,
            uint256 poolTokenId,
            uint256 amount0,
            uint256 amount1
        );

    function deposit(
        int24 baseLower,
        int24 baseUpper,
        uint256 amount0Desired,
        uint256 amount1Desired
    )
        external
        returns (
            uint256 boosterTokenId,
            uint256 tokenId,
            uint256 amount0,
            uint256 amount1
        );

    function withdraw(uint256 tokenId, address to)
        external
        returns (
            uint256 feeAmount0,
            uint256 feeAmount1,
            uint256 total0,
            uint256 total1
        );

    function positions(uint256 tokenId)
        external
        view
        returns (
            address operator,
            uint8 uniswapShares,
            uint256 amount0,
            uint256 amount1,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );
}
