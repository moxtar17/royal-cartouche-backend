const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files
app.use('/static', express.static('static'));

// Get Printify API credentials from environment variables
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;

// ============================================================
// TEST ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
  res.json({ message: 'Royal Cartouche API is running!' });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ============================================================
// PRODUCT ENDPOINTS
// ============================================================

// Get all products from Printify
app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products.json`,
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get a single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products/${id}.json`,
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ============================================================
// WEBHOOK ENDPOINT - Handles both GET (validation) and POST (events)
// ============================================================

// Respond to GET requests (for webhook validation)
app.get('/api/webhooks/publish', (req, res) => {
  // Printify expects a 200 OK response for validation
  res.status(200).send('Webhook endpoint is active');
});

// Handle POST requests (for actual webhook events)
app.post('/api/webhooks/publish', async (req, res) => {
  try {
    console.log('📥 Received publish webhook:', req.body);
    res.status(200).json({ 
      success: true, 
      message: 'Publish webhook received successfully' 
    });
  } catch (error) {
    console.error('Error handling publish webhook:', error.message);
    res.status(500).json({ error: 'Failed to process publish webhook' });
  }
});

// ============================================================
// WEBHOOK REGISTRATION ENDPOINT - FIXED
// ============================================================

app.get('/register-webhook', async (req, res) => {
  try {
    // First, check if webhook already exists
    const listResponse = await axios.get(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`,
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`
        }
      }
    );
    
    // Check if our webhook already exists
    const existing = listResponse.data.find(w => 
      w.topic === 'product.published' && 
      w.url === 'https://royal-cartouche-backend.onrender.com/api/webhooks/publish'
    );
    
    if (existing) {
      return res.json({ 
        success: true, 
        message: 'Webhook already registered!',
        data: existing 
      });
    }
    
    // If not, create it
    const response = await axios.post(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`,
      {
        topic: 'product.published',
        url: 'https://royal-cartouche-backend.onrender.com/api/webhooks/publish'
      },
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Webhook registered successfully!',
      data: response.data 
    });
  } catch (error) {
    console.error('Error registering webhook:', error.message);
    res.status(500).json({ 
      error: 'Failed to register webhook',
      details: error.response?.data || error.message
    });
  }
});

// ============================================================
// SHIPPING ENDPOINT
// ============================================================

app.post('/api/shipping', async (req, res) => {
  try {
    const { productId, quantity, address } = req.body;
    const baseShipping = 4.99;
    const perItem = 2.50;
    const total = baseShipping + (perItem * quantity);
    
    res.json({
      shipping: total,
      currency: 'USD',
      estimated_days: '3-5 business days'
    });
  } catch (error) {
    console.error('Error calculating shipping:', error.message);
    res.status(500).json({ error: 'Failed to calculate shipping' });
  }
});

// ============================================================
// ORDER ENDPOINT
// ============================================================

app.post('/api/orders', async (req, res) => {
  try {
    const { productId, variantId, quantity, shippingAddress } = req.body;
    res.json({
      success: true,
      message: 'Order created successfully',
      orderId: `ORDER-${Date.now()}`
    });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Royal Cartouche backend running on port ${PORT}`);
});
