// SPDX-License-Identifier: Unlicense

pragma solidity >=0.7.5 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/LiquidityAmounts.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3MintCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "hardhat/console.sol";

import "../interfaces/IUniswapBooster.sol";

contract UniswapBooster is
    IUniswapBooster,
    ReentrancyGuard,
    Ownable,
    ERC721,
    IERC721Receiver
{
    using TickMath for int24;
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    IUniswapV3Pool public immutable pool;
    ISwapRouter public immutable swapRouter;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint24 public immutable feeAmount;

    /// @dev Current booster shares
    uint8 public shares;

    /// @dev TokenId Position in booster pool
    mapping(uint256 => BoosterPosition) private _positions;

    /// @dev The ID of the next token that will be minted. Starting from 1
    uint256 private _nextTokenId = 1;

    /// @dev Scale factor
    uint128 private constant _scaleTo = 100;

    /// @dev Max shares value
    uint8 public constant MAX_SHARES = 100;

    /// @dev Min shares value
    uint8 public constant MIN_SHARES = 5;

    /// @dev Bonus base
    uint8 public constant BONUS_BASE = 100;

    /**
     * @param _nonfungiblePositionManager NonfungiblePositionManager of uniswap
     * @param _pool Uniswap pool address
     * @param _feeAmount Fee amount of pool
     * @param _shares Initial value of shares to uniswap
     */
    constructor(
        address _nonfungiblePositionManager,
        address _swapRouter,
        address _pool,
        uint24 _feeAmount,
        uint8 _shares
    ) ERC721("Booster Token", "BT") Ownable() {
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
        pool = IUniswapV3Pool(_pool);
        swapRouter = ISwapRouter(_swapRouter);
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
        require(_shares >= MIN_SHARES, "STL");
        require(_shares <= MAX_SHARES, "STH");

        shares = _shares;
    }

    /// @dev On ERC721 token received callback
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
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

        uint256 scaledAmount0 = FullMath.mulDiv(
            amount0Desired,
            shares,
            _scaleTo
        );
        uint256 scaledAmount1 = FullMath.mulDiv(
            amount1Desired,
            shares,
            _scaleTo
        );

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
        require(tokenId > 0, "invalid token ID");
        require(
            nonfungiblePositionManager.ownerOf(tokenId) == msg.sender,
            "owner only"
        );

        // Transfer NFT token with given tokenId to UniswapBooster
        nonfungiblePositionManager.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        (, , uint128 liquidity) = _nftPosition(tokenId);

        // Collect remaining fees and decrease liquidity from position
        (amount0, amount1) = _decreaseAndCollect(tokenId, liquidity);

        // Mint Booster NFT for sender
        _mint(msg.sender, (boosterTokenId = _nextTokenId++));

        // Add new position
        _positions[boosterTokenId] = BoosterPosition({
            tokenId: tokenId,
            operator: address(msg.sender),
            shares: shares,
            token0: amount0,
            token1: amount1
        });

        poolTokenId = tokenId;

        emit DepositNFT(msg.sender, tokenId, boosterTokenId);
    }

    /**
     * @notice Withdraws tokens
     * @param tokenId Token id to burn
     * @param to Recipient of tokens
     * @return feeAmount0 Extra fees amount of token0
     * @return feeAmount1 Extra fees amount of token1
     * @return total0 Amount of token0 sent to recipient
     * @return total1 Amount of token1 sent to recipient
     */
    function withdraw(uint256 tokenId, address to)
        external
        override
        nonReentrant
        returns (
            uint256 feeAmount0,
            uint256 feeAmount1,
            uint256 total0,
            uint256 total1
        )
    {
        require(tokenId > 0, "invalid token ID");
        // if given position does not exist throws "owner only", because operator is address zero
        require(_positions[tokenId].operator == msg.sender, "owner only");
        require(to != address(0) && to != address(this), "invalid to address");

        // Burn booster token
        _burn(tokenId);

        // Calculates token0 and token1 fees and total return value of token0 and token1
        // Prevents stack too deep error caused by too many local variables in current scope
        BurnAndCalculateResult memory result = _burnAndCalculateReturn(tokenId);

        // Transfer tokens to recipient
        if (result.total0 > 0) token0.safeTransfer(to, result.total0);
        if (result.total1 > 0) token1.safeTransfer(to, result.total1);

        // Free storage space
        delete _positions[tokenId];

        // Emit withdraw event
        emit Withdraw(
            msg.sender,
            to,
            tokenId,
            result.poolTokenId,
            result.total0,
            result.total1,
            result.feeAmount0,
            result.feeAmount1
        );

        return (
            result.feeAmount0,
            result.feeAmount1,
            result.total0,
            result.total1
        );
    }

    function _burnAndCalculateReturn(uint256 tokenId)
        internal
        returns (BurnAndCalculateResult memory result)
    {
        BoosterPosition memory position = _positions[tokenId];
        (int24 tickLower, int24 tickUpper, uint128 liquidity) = _nftPosition(
            position.tokenId
        );

        // Burn UniswapV3 LP token and collect all remaining fees and tokens
        (
            uint256 fees0,
            uint256 fees1,
            uint256 amount0,
            uint256 amount1
        ) = _burnAndCollectTokens(
                BurnAndCollectParams({
                    boosterTokenId: tokenId,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    liquidity: liquidity
                })
            );

        // // scale fees by 110% (MAX_SHARES + position shares)
        // result.feeAmount0 = FullMath.mulDiv(
        //     fees0,
        //     BONUS_BASE + position.shares,
        //     _scaleTo
        // );
        // result.feeAmount1 = FullMath.mulDiv(
        //     fees1,
        //     BONUS_BASE + position.shares,
        //     _scaleTo
        // );

        // 110% * fees collected + 100% position liquidity + amount taken on deposit (including fees)
        // result.total0 = (fees0 + amount0) + position.token0;
        // result.total1 = (fees1 + amount1) + position.token1;

        result.total0 = (fees0 + amount0);
        result.total1 = (fees1 + amount1);
        result.feeAmount0 = fees0;
        result.feeAmount1 = fees1;
        result.poolTokenId = position.tokenId;
    }

    /**
     * @notice Returns position data for given booster token Id
     * @param tokenId Booster token id
     */
    function positions(uint256 tokenId)
        public
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
        require(position.tokenId > 0, "invalid token ID");
        require(position.operator == msg.sender, "owner only");

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

    /// @dev Returns tickLower, tickUpper and liquidity of given position using tokenId
    function _nftPosition(uint256 tokenId)
        internal
        view
        returns (
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity
        )
    {
        (
            ,
            ,
            ,
            ,
            ,
            tickLower,
            tickUpper,
            liquidity,
            ,
            ,
            ,

        ) = nonfungiblePositionManager.positions(tokenId);
    }

    /**
     * @notice Decreases liquidity by given share and collects all remaining fees
     * @param tokenId token id of position in uniswap pool
     * @param liquidity liquidity in position
     * @return amount0 amount of token0 collected
     * @return amount1 amount of token1 collected
     */
    function _decreaseAndCollect(uint256 tokenId, uint128 liquidity)
        internal
        returns (uint256 amount0, uint256 amount1)
    {
        // Amount of liquidity decreased from UniswapV3 position
        uint128 scaledLiquidity = SafeCast.toUint128(
            FullMath.mulDiv(liquidity, BONUS_BASE - shares, _scaleTo)
        );

        // Decrease liquidity from position (BONUS_BASE - shares, i.e. 100% - 10% = 90%)
        nonfungiblePositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: scaledLiquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 30 minutes
            })
        );

        // Collect remaining fees and reduced tokens from position
        (amount0, amount1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    /**
     * @notice Removes all liquidity from positions, collects fees and then burn LP token
     * @param params burn and collect params
     * @return fees0 amount of token0 fees collected
     * @return fees1 amount of token1 fees collected
     * @return amount0 amount of token0 collected
     * @return amount1 amount of token1 collected
     */
    function _burnAndCollectTokens(BurnAndCollectParams memory params)
        internal
        returns (
            uint256 fees0,
            uint256 fees1,
            uint256 amount0,
            uint256 amount1
        )
    {
        BoosterPosition memory position = _positions[params.boosterTokenId];

        // Amount of token0 and token1 for given liquidity and price of tickLower, tickUpper and current price
        (uint256 _token0, uint256 _token1) = _liquidityToTokens(
            params.tickLower,
            params.tickUpper,
            params.liquidity
        );

        // Collect remaining fees
        (fees0, fees1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: position.tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        // Removes all liquidity from position
        nonfungiblePositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: position.tokenId,
                liquidity: params.liquidity,
                amount0Min: _token0,
                amount1Min: _token1,
                deadline: block.timestamp + 30 minutes
            })
        );

        // Collect all tokens from position
        (amount0, amount1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: position.tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        uint256 scaleBase = SafeCast.toUint256(position.shares);

        // Calculates scaled fees of 100% original pool value * (BONUS_BASE + SHARES) - e.g. 110% bonus
        uint256 scaledFees0 = FullMath.mulDiv(
            fees0 * scaleBase,
            BONUS_BASE + position.shares,
            _scaleTo
        );
        uint256 scaledFees1 = FullMath.mulDiv(
            fees1 * scaleBase,
            BONUS_BASE + position.shares,
            _scaleTo
        );

        uint256 required0 = amount0 + fees0 + position.token0;
        uint256 required1 = amount1 + fees1 + position.token1;

        // Amount of fees with bonus to transfer to LP
        fees0 = scaledFees0;
        fees1 = scaledFees1;

        // If required swap tokenIn to get remaining tokens of tokenOut
        SwapParams memory swapParams = SwapParams({
            required0: required0,
            required1: required1,
            amount0: amount0,
            amount1: amount1,
            fees0: scaledFees0,
            fees1: scaledFees1,
            scaleBase: scaleBase
        });

        // Swap if needed to get back all LP tokens
        bool swapTokens = _swapMissingTokens(swapParams);

        if (swapTokens) {
            amount0 *= scaleBase;
            amount1 *= scaleBase;

            console.log("SWAP");
        } else {
            amount0 += position.token0;
            amount1 += position.token1;

            console.log("NO SWAP");
        }

        {
            console.log("fess0 %s", fees0);
            console.log("fees1 %s", fees1);
            console.log("transferTo token0 %s", amount0 + fees0);
            console.log("transferTo token1 %s", amount1 + fees1);
        }

        // Burns NFT token, applicable only if liquidity, tokensOwed0 and tokensOwed1 are zero
        nonfungiblePositionManager.burn(position.tokenId);
    }

    function _swapMissingTokens(SwapParams memory params)
        internal
        returns (bool swap)
    {
        uint256 swapAmount = 0;
        IERC20 tokenIn;
        IERC20 tokenOut;

        // Amount of tokens to return back to LP
        params.amount0 *= params.scaleBase;
        params.amount1 *= params.scaleBase;

        bool swapForToken0 = int256(
            (params.amount0 + params.fees0) - params.required0
        ) > 0;
        bool swapForToken1 = int256(
            (params.amount1 + params.fees1) - params.required1
        ) > 0;

        console.log("swapForToken0: %s", swapForToken0);
        console.log("swapForToken1: %s", swapForToken1);

        // No need to swap if both tokens are above 0 or below zero
        bool swapTokens = swapForToken0 != swapForToken1;

        if (swapForToken0) {
            // Swapping token1 for token0
            swapAmount = (params.amount0 + params.fees0) - params.required0;

            tokenIn = token1;
            tokenOut = token0;
        } else if (swapForToken1) {
            // Swapping token0 for token1
            swapAmount = (params.amount1 + params.fees1) - params.required1;

            tokenIn = token0;
            tokenOut = token1;
        }
        console.log(
            "To return %s token0, %s token1",
            params.required0,
            params.required1
        );

        console.log("Swap amount %s tokens", swapAmount);
        console.log("Amount0 %s", params.amount0);
        console.log("Amount1 %s", params.amount1);

        console.log(
            "balanceOf token0 %s before swap",
            token0.balanceOf(address(this))
        );
        console.log(
            "balanceOf token1 %s before swap",
            token1.balanceOf(address(this))
        );

        if (!(swapAmount > 0 && swapTokens)) return false;

        tokenIn.safeApprove(address(swapRouter), type(uint128).max);

        ISwapRouter.ExactOutputSingleParams memory swapParams = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: address(tokenIn),
                tokenOut: address(tokenOut),
                fee: feeAmount,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountOut: swapAmount,
                amountInMaximum: type(uint128).max,
                sqrtPriceLimitX96: 0
            });

        uint256 amountIn = swapRouter.exactOutputSingle(swapParams);

        (, int24 tick, , , , , ) = pool.slot0();
        console.log("swap amountIn %s ", amountIn);
        console.log("tick after swap %s ", uint128(tick));

        // Remove approval for using booster tokens
        tokenIn.safeApprove(address(swapRouter), 0);

        console.log(
            "balanceOf token0 %s after swap",
            token0.balanceOf(address(this))
        );
        console.log(
            "balanceOf token1 %s after swap",
            token1.balanceOf(address(this))
        );

        return true;
    }

    /// @dev Calculates amount of token0 and token1 for given liquidity and range from tickLower to tickUpper
    function _liquidityToTokens(
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal view returns (uint256, uint256) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();

        return
            LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(tickLower),
                TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity
            );
    }
}
