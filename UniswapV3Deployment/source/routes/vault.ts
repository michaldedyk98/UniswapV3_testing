import express from 'express';
import controller from '../controllers/vault';
const router = express.Router();

router.post('/boosterDepositNFT', controller.boosterDepositNFT);
router.post('/boosterDeposit', controller.boosterDeposit);
router.post('/boosterWithdraw', controller.boosterWithdraw);
router.post('/deposit', controller.deposit);
router.post('/withdraw', controller.withdraw);
router.post('/rebalance', controller.rebalance);
router.post('/manualRebalance', controller.manualRebalance);
router.post('/swapExactInput', controller.swapExactInput);
router.post('/swapExactOutput', controller.swapExactOutput);
router.post('/emergencyBurn', controller.emergencyBurn);
router.post('/moveMarketTo', controller.moveMarketTo);
router.post('/getTVL', controller.getTVL);
router.post('/getAlphaVaultTVL', controller.getAlphaVaultTVL);
router.post('/getPriceImpactTVL', controller.getPriceImpactTVL);
router.post('/deployAlphaVault', controller.deployAlphaVault);
router.post('/processTransactions', controller.processTransactions);
router.post('/addLiquidity', controller.addLiquidity);

router.get('/getAlphaVaultData', controller.getAlphaVaultData);
router.get('/getTicksData', controller.getTicksData);
router.get('/getSlot0', controller.getSlot0);
router.get('/getBalance0', controller.getBalance0);
router.get('/getBalance1', controller.getBalance1);
router.get('/getPositionAmounts', controller.getPositionAmounts);
router.get('/getTotalAmounts', controller.getTotalAmounts);
router.get('/poke', controller.poke);
router.get('/getBalanceOf', controller.getBalanceOf);
router.get('/getLiquidityAt', controller.getLiquidityAt);
router.get('/getBoosterPosition', controller.getBoosterPosition);

export = router;