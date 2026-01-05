const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payments/create-checkout-session - Create a new checkout session
router.post('/create-checkout-session', paymentController.createCheckoutSession);

// GET /api/payments/session/:sessionId - Get session status
router.get('/session/:sessionId', paymentController.getSessionStatus);

// POST /api/payments/confirm-payment - Confirm payment and update order status
router.post('/confirm-payment', paymentController.confirmPayment);

// GET /api/payments/order/:orderId - Get order by ID
router.get('/order/:orderId', paymentController.getOrder);

// GET /api/payments/orders - Get all orders (for admin)
router.get('/orders', paymentController.getAllOrders);

// POST /api/payments/create-payment-intent - Create payment intent
router.post('/create-payment-intent', paymentController.createPaymentIntent);

module.exports = router;
