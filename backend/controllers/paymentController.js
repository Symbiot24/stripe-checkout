const Order = require('../models/order');

// Initialize Stripe - will be set after env is loaded
let stripe;

// Create checkout session
exports.createCheckoutSession = async (req, res) => {
  try {
    // Initialize stripe if not already done
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

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('Validation error: Items array is required');
      return res.status(400).json({ error: 'Items array is required' });
    }

    if (!customerEmail) {
      console.log('Validation error: Customer email is required');
      return res.status(400).json({ error: 'Customer email is required' });
    }

    // Transform items to Stripe line items format
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        customerEmail,
        totalAmount: totalAmount.toString(),
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'IN'],
      },
    });

    // Create order in database with pending status
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

// Get session status
exports.getSessionStatus = async (req, res) => {
  try {
    // Initialize stripe if not already done
    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Find order in database
    let order = await Order.findOne({ stripeSessionId: sessionId });

    // If payment is complete but order is still pending, update the order status
    // This handles cases where webhook didn't fire (e.g., local development)
    if (order && order.paymentStatus === 'pending' && session.payment_status === 'paid') {
      order.paymentStatus = 'paid';
      order.paymentIntentId = session.payment_intent;
      order.customerName = session.customer_details?.name || '';
      
      // Update shipping address if available
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

      // Store metadata
      order.metadata = {
        sessionId: session.id,
        customerId: session.customer,
        paymentIntentId: session.payment_intent,
      };

      await order.save();
      console.log(`Order ${order._id} updated to paid status via session status check`);
    }

    // Handle failed payment status - multiple scenarios
    if (order && order.paymentStatus === 'pending') {
      let shouldMarkAsFailed = false;
      let failureReason = '';

      // Session expired without payment
      if (session.payment_status === 'unpaid' && session.status === 'expired') {
        shouldMarkAsFailed = true;
        failureReason = 'Session expired without payment';
      }
      // Payment explicitly failed
      else if (session.payment_status === 'failed' || session.payment_status === 'canceled') {
        shouldMarkAsFailed = true;
        failureReason = session.payment_status === 'failed' ? 'Payment failed' : 'Payment canceled';
      }
      // Payment requires action but session is no longer open
      else if (session.payment_status === 'requires_payment_method' && session.status === 'expired') {
        shouldMarkAsFailed = true;
        failureReason = 'Payment method required but session expired';
      }
      // User opened the session but never completed (status is open but unpaid)
      else if (session.payment_status === 'unpaid' && session.status === 'open') {
        // Check if session was created more than 10 minutes ago
        const sessionCreatedAt = new Date(session.created * 1000);
        const minutesElapsed = (Date.now() - sessionCreatedAt.getTime()) / 1000 / 60;
        if (minutesElapsed > 10) {
          shouldMarkAsFailed = true;
          failureReason = 'Payment abandoned - session not completed';
        }
      }

      if (shouldMarkAsFailed) {
        order.paymentStatus = 'failed';
        order.metadata = {
          ...order.metadata,
          failureReason,
          failedAt: new Date().toISOString(),
          stripeStatus: session.status,
          stripePaymentStatus: session.payment_status,
        };
        await order.save();
        console.log(`Order ${order._id} marked as failed - ${failureReason}`);
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

// Get order by ID
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

// Get all orders (optional - for admin)
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

// Create payment intent (alternative to checkout session)
exports.createPaymentIntent = async (req, res) => {
  try {
    // Initialize stripe if not already done
    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { amount, currency = 'usd', customerEmail } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
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

// Confirm payment and update order status - fallback for webhook
exports.confirmPayment = async (req, res) => {
  try {
    // Initialize stripe if not already done
    if (!stripe) {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve session from Stripe to get actual payment status
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Find order in database
    const order = await Order.findOne({ stripeSessionId: sessionId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only update if payment is actually complete in Stripe
    if (session.payment_status === 'paid') {
      order.paymentStatus = 'paid';
      order.paymentIntentId = session.payment_intent;
      order.customerName = session.customer_details?.name || '';

      // Update shipping address if available
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

      // Store metadata
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
    } else if (session.payment_status === 'unpaid' || session.payment_status === 'failed' || session.payment_status === 'canceled') {
      // Mark order as failed if payment was not completed
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed';
        order.metadata = {
          ...order.metadata,
          failureReason: session.payment_status === 'canceled' ? 'Payment canceled by user' : 'Payment not completed',
          failedAt: new Date().toISOString(),
          stripeStatus: session.status,
          stripePaymentStatus: session.payment_status,
        };
        await order.save();
        console.log(`Order ${order._id} marked as failed via confirmPayment endpoint`);
      }

      res.status(200).json({
        success: false,
        message: session.payment_status === 'canceled' ? 'Payment was canceled' : 'Payment not completed',
        stripeStatus: session.payment_status,
        order: order,
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Payment status: ${session.payment_status}`,
        stripeStatus: session.payment_status,
        order: order,
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
};
