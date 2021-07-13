import express from 'express';
import controller from '../controllers/vault';
const router = express.Router();

router.post('/deposit', controller.deposit);
router.post('/withdraw', controller.withdraw);
router.post('/rebalance', controller.rebalance);
router.post('/swapExactInput', controller.swapExactInput);
router.post('/swapExactOutput', controller.swapExactOutput);
router.post('/emergencyBurn', controller.emergencyBurn);
router.get('/getAlphaVaultData', controller.getAlphaVaultData);
router.get('/getTicksData', controller.getTicksData);
router.get('/getSlot0', controller.getSlot0);
router.get('/getBalance0', controller.getBalance0);
router.get('/getBalance1', controller.getBalance1);
router.get('/getPositionAmounts', controller.getPositionAmounts);
router.get('/getTotalAmounts', controller.getTotalAmounts);

export = router;