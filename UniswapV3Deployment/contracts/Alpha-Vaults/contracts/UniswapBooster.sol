// SPDX-License-Identifier: Unlicense

pragma solidity >=0.7.5 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";

import "../interfaces/IUniswapBooster.sol";

contract UniswapBooster is
    IUniswapBooster,
    ReentrancyGuard,
    Ownable,
    ERC721,
    IERC721Receiver,
    IUniswapV3MintCallback,
    IUniswapV3SwapCallback
{
    using TickMath for int24;
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    IUniswapV3Pool public immutable pool;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint24 public immutable feeAmount;

    /// @dev current booster shares
    uint8 public shares;

    /// @dev TokenId Position in booster pool
    mapping(uint256 => BoosterPosition) private _positions;

    /// @dev The ID of the next token that will be minted. Starting from 1
    uint256 private _nextTokenId = 1;

    /**
     * @param _nonfungiblePositionManager NonfungiblePositionManager of uniswap
     * @param _pool Uniswap pool address
     * @param _feeAmount Fee amount of pool
     * @param _shares Initial value of shares to uniswap
     */
    constructor(
        address _nonfungiblePositionManager,
        address _pool,
        uint24 _feeAmount,
        uint8 _shares
    ) ERC721("Booster Token", "BT") Ownable() {
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
        pool = IUniswapV3Pool(_pool);
        token0 = IERC20(IUniswapV3Pool(_pool).token0());
        token1 = IERC20(IUniswapV3Pool(_pool).token1());
        feeAmount = _feeAmount;

        updateShares(_shares);
    }

    /**
     * @notice Updates booster shares value, owner only
     * @param _shares New shares value
     */
    function updateShares(uint8 _shares) public onlyOwner {
        require(_shares >= 5, "shares < 5");
        require(_shares <= 100, "shares > 100");

        shares = _shares;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /// @dev Callback for Uniswap V3 pool mint, transfers tokens from this contract to uniswap
    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(msg.sender == address(pool), "Pool address is invalid");
        if (amount0 > 0) token0.safeTransfer(msg.sender, amount0);
        if (amount1 > 0) token1.safeTransfer(msg.sender, amount1);
    }

    /// @dev Callback for Uniswap V3 pool.
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        require(msg.sender == address(pool));
        if (amount0Delta > 0)
            token0.safeTransfer(msg.sender, uint256(amount0Delta));
        if (amount1Delta > 0)
            token1.safeTransfer(msg.sender, uint256(amount1Delta));
    }

    /**
     * @notice Deposits tokens in proportion to the uniswap pool.
     * @param baseLower Lower tick
     * @param baseUpper Upper tick
     * @param amount0Desired Max amount of token0 to deposit
     * @param amount1Desired Max amount of token1 to deposit
     * @return boosterTokenId Id of UniswapBooster token
     * @return tokenId Id of uniswap token
     * @return amount0 Amount of token0 deposited
     * @return amount1 Amount of token1 deposited
     */
    function deposit(
        int24 baseLower,
        int24 baseUpper,
        uint256 amount0Desired,
        uint256 amount1Desired
    )
        external
        override
        nonReentrant
        returns (
            uint256 boosterTokenId,
            uint256 tokenId,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(
            amount0Desired > 0 || amount1Desired > 0,
            "amount0Desired OR amount1Desired"
        );

        require(baseLower < baseUpper, "baseLower > baserUpper");
        require(
            TickMath.MAX_TICK >= baseUpper && TickMath.MIN_TICK < baseUpper,
            "baseUpper NOT BETWEEN MAX_TICK && MIN_TICK"
        );
        require(
            TickMath.MIN_TICK <= baseLower && TickMath.MAX_TICK > baseLower,
            "baseLower NOT BETWEEN MAX_TICK && MIN_TICK"
        );

        // Pull in tokens from sender
        if (amount0Desired > 0)
            token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
        if (amount1Desired > 0)
            token1.safeTransferFrom(msg.sender, address(this), amount1Desired);

        uint256 scaledAmount0 = scale(amount0Desired, shares, 100);
        uint256 scaledAmount1 = scale(amount1Desired, shares, 100);

        token0.approve(address(nonfungiblePositionManager), amount0Desired);
        token1.approve(address(nonfungiblePositionManager), amount1Desired);

        (tokenId, , amount0, amount1) = nonfungiblePositionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: address(token0),
                token1: address(token1),
                fee: feeAmount,
                tickLower: baseLower,
                tickUpper: baseUpper,
                amount0Desired: scaledAmount0,
                amount1Desired: scaledAmount1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 30 minutes
            })
        );

        _mint(msg.sender, (boosterTokenId = _nextTokenId++));

        _positions[boosterTokenId] = BoosterPosition({
            tokenId: tokenId,
            operator: address(msg.sender),
            shares: shares,
            token0: amount0Desired,
            token1: amount1Desired
        });

        emit Deposit(msg.sender, tokenId, boosterTokenId, amount0, amount1);
    }

    /**
     * @notice Deposits position in uniswap v3 pool using NFT token
     * @param tokenId TokenId of UniswapV3 LP
     * @return boosterTokenId Id of UniswapBooster token
     * @return poolTokenId Id of uniswap token
     * @return amount0 Amount of token0 deposited
     * @return amount1 Amount of token1 deposited
     */
    function depositNFT(uint256 tokenId)
        external
        override
        nonReentrant
        returns (
            uint256 boosterTokenId,
            uint256 poolTokenId,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(tokenId > 0, "Invalid token ID");

        nonfungiblePositionManager.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        (
            ,
            ,
            ,
            ,
            ,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            ,
            ,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        ) = nonfungiblePositionManager.positions(tokenId);

        (uint256 amount0, uint256 amount1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        // token0.approve(address(nonfungiblePositionManager), amount0Desired);
        // token1.approve(address(nonfungiblePositionManager), amount1Desired);

        _mint(msg.sender, (boosterTokenId = _nextTokenId++));

        _positions[boosterTokenId] = BoosterPosition({
            tokenId: tokenId,
            operator: address(msg.sender),
            shares: shares,
            token0: amount0,
            token1: amount1
        });

        emit DepositNFT(msg.sender, tokenId, boosterTokenId);
    }

    /**
     * @notice Withdraws tokens
     * @param tokenId Token id to burn
     * @param to Recipient of tokens
     * @return amount0 Amount of token0 sent to recipient
     * @return amount1 Amount of token1 sent to recipient
     */
    function withdraw(uint256 tokenId, address to)
        external
        override
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        require(tokenId > 0, "invalid token ID");
        require(_positions[tokenId].operator == msg.sender, "operator");
        require(to != address(0) && to != address(this), "to");

        BoosterPosition memory position = _positions[tokenId];

        // Burn booster token
        _burn(tokenId);

        // Sum up total amounts owed to recipient
        amount0 = 1;
        amount1 = 1;
        // require(amount0 >= amount0Min, "amount0Min");
        // require(amount1 >= amount1Min, "amount1Min");

        // Push tokens to recipient
        if (amount0 > 0) token0.safeTransfer(to, amount0);
        if (amount1 > 0) token1.safeTransfer(to, amount1);

        emit Withdraw(msg.sender, tokenId, position.tokenId, amount0, amount1);
    }

    function positions(uint256 tokenId)
        external
        view
        override
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
        )
    {
        BoosterPosition memory position = _positions[tokenId];
        require(position.tokenId != 0, "Invalid token ID");
        require(position.operator == msg.sender, "Owner only");

        (
            ,
            operator,
            ,
            ,
            ,
            tickLower,
            tickUpper,
            liquidity,
            ,
            ,
            tokensOwed0,
            tokensOwed1
        ) = nonfungiblePositionManager.positions(position.tokenId);

        return (
            operator,
            position.shares,
            position.token0,
            position.token1,
            tickLower,
            tickUpper,
            liquidity,
            tokensOwed0,
            tokensOwed1
        );
    }

    function _liquidityToTokens(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal view returns (uint256 token0, uint256 token1) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();

        return
            LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickLower),
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity
            );
    }

    function _scale(
        uint256 x,
        uint256 y,
        uint128 scale
    ) internal pure returns (uint256) {
        uint256 a = x / scale;
        uint256 b = x % scale;
        uint256 c = y / scale;
        uint256 d = y % scale;

        return a * c * scale + a * d + b * c + (b * d) / scale;
    }

    // /// @dev Withdraws share of liquidity in a range from Uniswap pool.
    // function _burnLiquidity(
    //     int24 tickLower,
    //     int24 tickUpper,
    //     uint256 shares,
    //     uint256 totalSupply
    // ) internal returns (uint256 amount0, uint256 amount1) {
    //     (uint128 totalLiquidity, , , , ) = _position(tickLower, tickUpper);
    //     uint256 liquidity = uint256(totalLiquidity).mul(shares).div(
    //         totalSupply
    //     );

    //     if (liquidity > 0) {
    //         (
    //             uint256 burned0,
    //             uint256 burned1,
    //             uint256 fees0,
    //             uint256 fees1
    //         ) = _burnAndCollect(tickLower, tickUpper, _toUint128(liquidity));

    //         // Add share of fees
    //         amount0 = burned0.add(fees0.mul(shares).div(totalSupply));
    //         amount1 = burned1.add(fees1.mul(shares).div(totalSupply));
    //     }
    // }
}
