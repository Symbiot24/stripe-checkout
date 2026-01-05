const Order = require('../models/order');

let stripe;

const stripeWebhook = async (req, res) => {

  if (!stripe) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentIntentFailed(failedPayment);
        break;

      case 'charge.refunded':
        const refund = event.data.object;
        await handleChargeRefunded(refund);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event: ${error.message}`);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

const handleCheckoutSessionCompleted = async (session) => {
  console.log('Checkout session completed:', session.id);

  try {

    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }


    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items', 'customer', 'payment_intent'],
    });

 
    const order = await Order.findOne({ stripeSessionId: session.id });

    if (order) {
      order.paymentStatus = 'paid';
      order.paymentIntentId = session.payment_intent;
      order.customerName = session.customer_details?.name || '';
      

      if (session.shipping_details?.address) {
        order.shippingAddress = {
          line1: session.shipping_details.address.line1,
          line2: session.shipping_details.address.line2,
          city: session.shipping_details.address.city,
          state: session.shipping_details.address.state,
          postal_code: session.shipping_details.address.postal_code,
          country: session.shipping_details.address.country,
        };
      }


      order.metadata = {
        sessionId: session.id,
        customerId: session.customer,
        paymentIntentId: session.payment_intent,
      };

      await order.save();
      console.log(`Order ${order._id} updated to paid status`);
    } else {
      console.warn(`Order not found for session: ${session.id}`);
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
};


const handlePaymentIntentSucceeded = async (paymentIntent) => {
  console.log('Payment intent succeeded:', paymentIntent.id);

  try {

    const order = await Order.findOne({ paymentIntentId: paymentIntent.id });

    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
      console.log(`Order ${order._id} marked as paid`);
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
};


const handlePaymentIntentFailed = async (paymentIntent) => {
  console.log('Payment intent failed:', paymentIntent.id);

  try {

    const order = await Order.findOne({ paymentIntentId: paymentIntent.id });

    if (order) {
      order.paymentStatus = 'failed';
      order.metadata = {
        ...order.metadata,
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
      };
      await order.save();
      console.log(`Order ${order._id} marked as failed`);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
};


const handleChargeRefunded = async (charge) => {
  console.log('Charge refunded:', charge.id);

  try {

    const order = await Order.findOne({ paymentIntentId: charge.payment_intent });

    if (order) {
      order.paymentStatus = 'refunded';
      order.metadata = {
        ...order.metadata,
        refundId: charge.refunds?.data[0]?.id,
        refundReason: charge.refunds?.data[0]?.reason || 'Refund processed',
      };
      await order.save();
      console.log(`Order ${order._id} marked as refunded`);
    }
  } catch (error) {
    console.error('Error handling charge refunded:', error);
    throw error;
  }
};

module.exports = stripeWebhook;
