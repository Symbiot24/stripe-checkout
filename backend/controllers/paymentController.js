const Order = require('../models/order');


let stripe;


exports.createCheckoutSession = async (req, res) => {
  try {

    if (!stripe) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        console.error('STRIPE_SECRET_KEY is not set in environment variables');
        return res.status(500).json({ error: 'Stripe configuration error' });
      }
      stripe = require('stripe')(stripeKey);
    }

    const { items, customerEmail, successUrl, cancelUrl } = req.body;

    console.log('Checkout session request:', { 
      itemsCount: items?.length, 
      customerEmail,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl
    });


    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('Validation error: Items array is required');
      return res.status(400).json({ error: 'Items array is required' });
    }

    if (!customerEmail) {
      console.log('Validation error: Customer email is required');
      return res.status(400).json({ error: 'Customer email is required' });
    }


    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), 
      },
      quantity: item.quantity,
    }));


    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        customerEmail,
        totalAmount: totalAmount.toString(),
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'IN'],
      },
    });


    const order = new Order({
      stripeSessionId: session.id,
      customerEmail,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
      currency: 'usd',
      paymentStatus: 'pending',
    });

    await order.save();

    console.log('Checkout session created successfully:', {
      sessionId: session.id,
      orderId: order._id,
      totalAmount
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
      orderId: order._id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    res.status(500).json({ 
      error: error.message || 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.getSessionStatus = async (req, res) => {
  try {

    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    

    let order = await Order.findOne({ stripeSessionId: sessionId });


    if (order && order.paymentStatus === 'pending' && session.payment_status === 'paid') {
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
      console.log(`Order ${order._id} updated to paid status via session status check`);
    }


    if (order && order.paymentStatus === 'pending') {

      if (session.payment_status === 'unpaid' && session.status === 'expired') {
        order.paymentStatus = 'failed';
        order.metadata = {
          ...order.metadata,
          failureReason: 'Session expired without payment',
          sessionStatus: session.status,
        };
        await order.save();
        console.log(`Order ${order._id} marked as failed - session expired`);
      }

      else if (session.status === 'complete' && session.payment_status === 'unpaid') {
        order.paymentStatus = 'failed';
        order.metadata = {
          ...order.metadata,
          failureReason: 'Payment was not completed',
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
        };
        await order.save();
        console.log(`Order ${order._id} marked as failed - payment unsuccessful`);
      }
    }

    res.status(200).json({
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      order: order,
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error retrieving order:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getAllOrders = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments();

    res.status(200).json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.createPaymentIntent = async (req, res) => {
  try {

    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { amount, currency = 'usd', customerEmail } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      receipt_email: customerEmail,
      metadata: {
        customerEmail,
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.confirmPayment = async (req, res) => {
  try {

    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }


    const session = await stripe.checkout.sessions.retrieve(sessionId);


    const order = await Order.findOne({ stripeSessionId: sessionId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (session.payment_status === 'paid') {
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
        confirmedAt: new Date().toISOString(),
      };

      await order.save();
      console.log(`Order ${order._id} confirmed as paid via confirmPayment endpoint`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        order: order,
      });
    } else if (session.payment_status === 'unpaid') {

      if (session.status === 'expired' || session.status === 'complete') {
        order.paymentStatus = 'failed';
        order.metadata = {
          ...order.metadata,
          failureReason: session.status === 'expired' ? 'Session expired' : 'Payment failed',
          sessionStatus: session.status,
          failedAt: new Date().toISOString(),
        };
        await order.save();
        console.log(`Order ${order._id} marked as failed via confirmPayment endpoint`);
      }

      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        stripeStatus: session.payment_status,
        sessionStatus: session.status,
        order: order,
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Payment status: ${session.payment_status}`,
        stripeStatus: session.payment_status,
        sessionStatus: session.status,
        order: order,
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
};
