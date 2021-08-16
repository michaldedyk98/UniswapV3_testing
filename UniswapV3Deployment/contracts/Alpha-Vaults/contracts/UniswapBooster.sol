// SPDX-License-Identifier: Unlicense

pragma solidity >=0.7.5 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
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
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import "hardhat/console.sol";

import "../interfaces/IUniswapBooster.sol";
import "./Pausable.sol";

contract UniswapBooster is
    IUniswapBooster,
    ReentrancyGuard,
    Ownable,
    ERC721,
    IERC721Receiver,
    Pausable
{
    using TickMath for int24;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    IUniswapV3Pool public immutable pool;
    ISwapRouter public immutable swapRouter;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint24 public immutable feeAmount;

    /// @dev Current booster shares
    uint8 public shares;

    /// @dev TokenId to position in booster pool
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

    /// @dev balance of booster protocol
    uint256 public boosterProtocolBalance1 = 0;

    uint256 private _emergencyModeBlock = type(uint128).max;

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
    function updateShares(uint8 _shares) public override onlyOwner {
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

    // /**
    //  * @notice Deposits tokens in proportion to the uniswap pool.
    //  * @param baseLower Lower tick
    //  * @param baseUpper Upper tick
    //  * @param amount0Desired Max amount of token0 to deposit
    //  * @param amount1Desired Max amount of token1 to deposit
    //  * @return boosterTokenId Id of UniswapBooster token
    //  * @return tokenId Id of uniswap token
    //  * @return amount0 Amount of token0 deposited
    //  * @return amount1 Amount of token1 deposited
    //  */
    // function deposit(
    //     int24 baseLower,
    //     int24 baseUpper,
    //     uint256 amount0Desired,
    //     uint256 amount1Desired
    // )
    //     external
    //     override
    //     nonReentrant
    //     whenNotPaused
    //     returns (
    //         uint256 boosterTokenId,
    //         uint256 tokenId,
    //         uint256 amount0,
    //         uint256 amount1
    //     )
    // {
    //     require(
    //         amount0Desired > 0 || amount1Desired > 0,
    //         "amount0Desired OR amount1Desired"
    //     );

    //     require(baseLower < baseUpper, "baseLower > baserUpper");
    //     require(
    //         TickMath.MAX_TICK >= baseUpper && TickMath.MIN_TICK < baseUpper,
    //         "baseUpper NOT BETWEEN MAX_TICK && MIN_TICK"
    //     );
    //     require(
    //         TickMath.MIN_TICK <= baseLower && TickMath.MAX_TICK > baseLower,
    //         "baseLower NOT BETWEEN MAX_TICK && MIN_TICK"
    //     );

    //     // Pull in tokens from sender
    //     if (amount0Desired > 0)
    //         token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
    //     if (amount1Desired > 0)
    //         token1.safeTransferFrom(msg.sender, address(this), amount1Desired);

    //     uint256 scaledAmount0 = FullMath.mulDiv(
    //         amount0Desired,
    //         shares,
    //         _scaleTo
    //     );
    //     uint256 scaledAmount1 = FullMath.mulDiv(
    //         amount1Desired,
    //         shares,
    //         _scaleTo
    //     );

    //     token0.approve(address(nonfungiblePositionManager), amount0Desired);
    //     token1.approve(address(nonfungiblePositionManager), amount1Desired);

    //     (tokenId, , amount0, amount1) = nonfungiblePositionManager.mint(
    //         INonfungiblePositionManager.MintParams({
    //             token0: address(token0),
    //             token1: address(token1),
    //             fee: feeAmount,
    //             tickLower: baseLower,
    //             tickUpper: baseUpper,
    //             amount0Desired: scaledAmount0,
    //             amount1Desired: scaledAmount1,
    //             amount0Min: 0,
    //             amount1Min: 0,
    //             recipient: address(this),
    //             deadline: block.timestamp + 30 minutes
    //         })
    //     );

    //     _mint(msg.sender, (boosterTokenId = _nextTokenId++));

    //     _positions[boosterTokenId] = BoosterPosition({
    //         tokenId: tokenId,
    //         operator: address(msg.sender),
    //         shares: shares,
    //         token0: amount0Desired,
    //         token1: amount1Desired
    //     });

    //     emit Deposit(msg.sender, tokenId, boosterTokenId, amount0, amount1);
    // }

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
        whenNotPaused
        returns (
            uint256 boosterTokenId,
            uint256 poolTokenId,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(tokenId > 0, "INV_ID");
        require(
            nonfungiblePositionManager.ownerOf(tokenId) == msg.sender,
            "OWNER"
        );

        // Check if given tokenId belongs to the pool that booster is in
        (address _token0, address _token1, uint24 _fee) = _nftToPoolPosition(
            tokenId
        );
        require(
            _token0 == pool.token0() &&
                _token1 == pool.token1() &&
                _fee == pool.fee(),
            "INV_POOL"
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
        whenNotPaused
        returns (
            uint256 feeAmount0,
            uint256 feeAmount1,
            uint256 total0,
            uint256 total1
        )
    {
        require(tokenId > 0, "INV_ID");
        require(
            nonfungiblePositionManager.ownerOf(tokenId) == msg.sender,
            "OWNER"
        );
        require(to != address(0) && to != address(this), "INV_ADDR");

        // Calculates token0 and token1 fees and total return value of token0 and token1
        // Prevents stack too deep error caused by too many local variables in current scope
        // try _burnAndCalculateReturn(tokenId, to) returns (
        //     BurnAndCalculateResult memory result
        // ) {
        //     console.log("SUCCESS");

        //     // Emit withdraw event
        //     emit Withdraw(
        //         msg.sender,
        //         to,
        //         tokenId,
        //         result.poolTokenId,
        //         result.total0,
        //         result.total1,
        //         result.feeAmount0,
        //         result.feeAmount1
        //     );

        //     return (
        //         result.feeAmount0,
        //         result.feeAmount1,
        //         result.total0,
        //         result.total1
        //     );
        // } catch (string memory reason) {
        //     console.log(reason);

        //     _pause();
        // }
        //BurnAndCalculateResult memory result = _burnAndCalculateReturn(tokenId);

        // // Free storage space
        // delete _positions[tokenId];
    }

    /**
     * @notice Withdraw all tokens in position and balance on booster
     * @param tokenId Token id to burn
     * @return total0 Amount of token0 sent to msg.sender
     * @return total1 Amount of token1 sent to msg.sender
     */
    function emergencyWithdraw(uint256 tokenId)
        external
        override
        nonReentrant
        whenPaused
        returns (uint256 total0, uint256 total1)
    {
        require(tokenId > 0, "INV_ID");
        require(
            nonfungiblePositionManager.ownerOf(tokenId) == msg.sender,
            "OWNER"
        );
        BoosterPosition memory position = _positions[tokenId];

        // Burn booster token
        _burn(tokenId);

        // Remove all liquidity and collect all tokens and fees from position then burn NFT on uniswap
        (total0, total1) = _emergencyBurnAndCollect(tokenId);

        // Add remaining tokens collected on deposit
        total0 += position.token0;
        total1 += position.token1;

        // Transfer tokens back to recipient
        if (total0 > 0) token0.safeTransfer(msg.sender, total0);
        if (total1 > 0) token1.safeTransfer(msg.sender, total1);

        // Free storage space
        delete _positions[tokenId];

        // Emit emergency withdraw event
        emit EmergencyWithdraw(
            msg.sender,
            tokenId,
            position.tokenId,
            total0,
            total1
        );
    }

    /// @dev burns position NFT and returns number of tokens0, token1 and fees to transfer back to withdrawer
    function _burnAndCalculateReturn(uint256 tokenId, address to)
        internal
        returns (BurnAndCalculateResult memory result)
    {
        BoosterPosition memory position = _positions[tokenId];
        (int24 tickLower, int24 tickUpper, uint128 liquidity) = _nftPosition(
            position.tokenId
        );

        // Burn booster token
        _burn(tokenId);

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
                    liquidity: liquidity,
                    to: to
                })
            );

        result.total0 = amount0;
        result.total1 = amount1;
        result.feeAmount0 = fees0;
        result.feeAmount1 = fees1;
        result.poolTokenId = position.tokenId;
    }

    /// @dev in case of emergency burns position on uniswap and withdraws all tokens
    function _emergencyBurnAndCollect(uint256 tokenId)
        internal
        returns (uint256 total0, uint256 total1)
    {
        BoosterPosition memory position = _positions[tokenId];
        (, , uint128 liquidity) = _nftPosition(position.tokenId);

        // Decrease 100% of liquidity from position
        nonfungiblePositionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp + 30 minutes
            })
        );

        // Collect remaining fees and reduced tokens from position
        (total0, total1) = nonfungiblePositionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        // Burns NFT token, applicable only if liquidity, tokensOwed0 and tokensOwed1 are zero
        nonfungiblePositionManager.burn(position.tokenId);

        // Free storage space
        delete _positions[tokenId];
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
        require(position.tokenId > 0, "INV_ID");
        require(
            nonfungiblePositionManager.ownerOf(tokenId) == msg.sender,
            "OWNER"
        );

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

    /// @dev Returns address of token0 and token1 to which the tokenId position belongs
    function _nftToPoolPosition(uint256 tokenId)
        internal
        view
        returns (
            address token0Pool,
            address token1Pool,
            uint24 fee
        )
    {
        (
            ,
            ,
            token0Pool,
            token1Pool,
            fee,
            ,
            ,
            ,
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
     * @notice Removes all liquidity from positions, collects fees and then burns LP token
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

        uint256 positionBalance0 = amount0 + fees0 + position.token0;
        uint256 positionBalance1 = amount1 + fees1 + position.token1;

        // Amount of fees with bonus to transfer to LP
        fees0 = scaledFees0;
        fees1 = scaledFees1;

        // If required swap tokenIn to get remaining tokens of tokenOut
        SwapParams memory swapParams = SwapParams({
            positionBalance0: positionBalance0,
            positionBalance1: positionBalance1,
            required0: amount0,
            required1: amount1,
            fees0: scaledFees0,
            fees1: scaledFees1,
            scaleBase: scaleBase
        });

        console.log("BL1_BEF: %s", token1.balanceOf(address(this)));

        // Swap if needed to get back all LP tokens
        (bool swapTokens, uint256 swapAmount) = _swapMissingTokens(swapParams);

        console.log("T0B: %s", token0.balanceOf(address(this)));
        console.log("T1B: %s", token1.balanceOf(address(this)));

        if (swapTokens) {
            amount0 *= scaleBase;
            amount1 *= scaleBase;
        } else {
            amount0 += position.token0;
            amount1 += position.token1;
        }

        amount0 += fees0;
        amount1 += fees1;

        console.log("AMT0: %s", amount0);
        console.log("AMT1: %s", amount1);

        // boosterProtocolBalance1 += token1.balanceOf(address(this)).sub(amount1);
        // boosterProtocolBalance1 += amount1 - swapAmount
        // boosterProtocolBalance1 += swapParams.positionBalance1 - swapAmount;
        // After swap
        //boosterProtocolBalance1 = -+ required1 - positionBalance1

        console.log("PB0: %s", swapParams.positionBalance0);
        console.log("PB1: %s", swapParams.positionBalance1);

        console.log("REQ0: %s", swapParams.required0);
        console.log("REQ1: %s", swapParams.required1);

        // TODO swap - calculate protocol fee
        if (swapTokens) {
            // Solidity 0.8+ will revert the overflow
            // uint256 requiredAmount = swapParams.required1.sub(fees1);
            // // uint256 boosterFee1 = swapParams.positionBalance1 -
            // //     swapParams.required1 -
            // //     fees1;

            // console.log("RA: %s", requiredAmount);

            if (swapParams.positionBalance1 >= amount1) {
                boosterProtocolBalance1 += swapParams.positionBalance1.sub(
                    amount1
                );
            } else {
                boosterProtocolBalance1 -= amount1.sub(
                    swapParams.positionBalance1
                );
            }
        }

        /// TODO check after swap with amount1
        // boosterProtocolBalance1 = amount1 - swap;

        console.log("SWAP_AMT: %s", swapAmount);
        console.log("BPB1: %s", boosterProtocolBalance1);

        // Revert if balance of token0 is not enough to make a transfer with amount0
        if (swapTokens && amount0 > swapParams.positionBalance0) {
            revert("T0TL");
        }

        // Revert if balance of token1 is not enough to make a transfer with amount1
        if (
            swapTokens &&
            amount1 > swapParams.positionBalance1 + boosterProtocolBalance1
        ) {
            revert("T1TL");
        }

        // Transfer tokens to recipient
        if (amount0 > 0) token0.safeTransfer(params.to, amount0);
        if (amount1 > 0) token1.safeTransfer(params.to, amount1);

        // Burns NFT token, applicable only if liquidity, tokensOwed0 and tokensOwed1 are zero
        nonfungiblePositionManager.burn(position.tokenId);
    }

    function _swapMissingTokens(SwapParams memory params)
        internal
        returns (bool swap, uint256 swapAmount)
    {
        // Amount of tokens to return back to LP
        params.required0 *= params.scaleBase;
        params.required1 *= params.scaleBase;

        // Do not swap if amount of token0 required is equal (or difference is only 1) to position balance
        if (
            int256(params.required0 - params.positionBalance0) == 1 ||
            int256(params.required0 - params.positionBalance0) == 0
        ) return (false, 0);

        // Max allowance for uniswap for swap
        uint256 maxAllowance = 0;

        // Swap type to execute
        SwapType swapType;

        if (params.required0 > params.positionBalance0) {
            maxAllowance = params.positionBalance1 + boosterProtocolBalance1;
            swapAmount =
                (params.required0 + params.fees0) -
                params.positionBalance0;

            swapType = SwapType.SwapExactOutput;
        } else {
            maxAllowance = params.positionBalance0;
            swapAmount =
                params.positionBalance0 -
                (params.required0 + params.fees0);

            swapType = SwapType.SwapExactInput;
        }

        console.log("Swap amount: %s", swapAmount);
        //console.log("Max allowance: %s", maxAllowance);
        // console.log("Swap type: %s", swapType == SwapType.SwapExactInput);

        // if required0 > positionBalance0 - buy exact amount output of required0 - positionBalance0
        // { maxAllowance = positionBalance1 + boosterProtocolBalance1 }
        // else - sell exact amount input of positionBalance0 - required0
        // { maxAllowance = positionBalance0 }

        // if required0 - positionBalance == 0 do not swap

        // // No need to swap if both tokens are above 0 or below zero
        // bool swapTokens = swapForToken0 != swapForToken1;

        // if (swapForToken0) {
        //     // Swapping token1 for token0
        //     swapAmount =
        //         (params.amount0 + params.fees0) -
        //         params.positionBalance0;

        //     tokenIn = token1;
        //     tokenOut = token0;
        // } else if (swapForToken1) {
        //     // Swapping token0 for token1
        //     swapAmount =
        //         (params.amount1 + params.fees1) -
        //         params.positionBalance1;

        //     tokenIn = token0;
        //     tokenOut = token1;
        // }

        // // Return false if swap was not executed
        // if (!(swapAmount > 0 && swapTokens)) return false;

        if (swapType == SwapType.SwapExactOutput) {
            console.log("SWAP_OUT");
            token1.safeApprove(address(swapRouter), maxAllowance);

            ISwapRouter.ExactOutputSingleParams memory swapParams = ISwapRouter
                .ExactOutputSingleParams({
                    tokenIn: address(token1),
                    tokenOut: address(token0),
                    fee: feeAmount,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountOut: swapAmount,
                    amountInMaximum: type(uint128).max,
                    sqrtPriceLimitX96: 0
                });

            // Execute exact output swap
            uint256 amountIn = swapRouter.exactOutputSingle(swapParams);

            // // Execute exact output swap
            // try swapRouter.exactOutputSingle(swapParams) returns (
            //     uint256 amountIn
            // ) {
            //     params.positionBalance1 -= amountIn;
            //     params.positionBalance0 += swapAmount;
            //     swapAmount = amountIn;
            // } catch Error(string memory reason) {
            //     // STF = Safe Transfer Failed, booster allowance was too low, changing to emergency mode
            //     if (keccak256(abi.encodePacked(reason)) == keccak256("STF")) {
            //         _pause();
            //         revert("SO_STF");
            //     }

            //     return (false, 0);
            // }
        } else if (swapType == SwapType.SwapExactInput) {
            console.log("SWAP_IN");
            token0.safeApprove(address(swapRouter), maxAllowance);

            ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: address(token0),
                    tokenOut: address(token1),
                    fee: feeAmount,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                    amountIn: swapAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });

            // Execute exact input swap
            uint256 amountOut = swapRouter.exactInputSingle(swapParams);

            // // Execute exact input swap
            // try swapRouter.exactInputSingle(swapParams) returns (
            //     uint256 amountOut
            // ) {
            //     params.positionBalance1 += amountOut;
            //     params.positionBalance0 -= swapAmount;
            //     swapAmount = amountOut;
            // } catch Error(string memory reason) {
            //     // STF = Safe Transfer Failed, booster allowance was too low, changing to emergency mode
            //     if (keccak256(abi.encodePacked(reason)) == keccak256("STF"))
            //         _pause();

            //     return (false, 0);
            // }
        }

        return (true, swapAmount);
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

    // /// @dev Overrides _approve and updates operator to new approved address
    // function _approve(address to, uint256 tokenId) internal override(ERC721) {
    //     _positions[tokenId].operator = to;
    //     emit Approval(ownerOf(tokenId), to, tokenId);
    // }

    /// @notice Pauses contract (the contract must not be paused), owner only
    function pause() external override onlyOwner {
        _pause();
    }

    /// @notice Unpauses contract (the contract must be paused), owner only
    function unpause() external override onlyOwner {
        _unpause();
    }
}
