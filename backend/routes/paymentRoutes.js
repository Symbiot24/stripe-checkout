const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');


router.post('/create-checkout-session', paymentController.createCheckoutSession);

router.get('/session/:sessionId', paymentController.getSessionStatus);

router.post('/confirm-payment', paymentController.confirmPayment);

router.get('/order/:orderId', paymentController.getOrder);

router.get('/orders', paymentController.getAllOrders);

router.post('/create-payment-intent', paymentController.createPaymentIntent);

module.exports = router;
