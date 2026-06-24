const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
// WEBHOOK ENDPOINT - Receives publish signals from Printify
// ============================================================

app.post('/api/webhooks/publish', async (req, res) => {
  try {
    console.log('📥 Received publish webhook:', req.body);
    
    // Acknowledge receipt of the publish signal
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
// SHIPPING ENDPOINT
// ============================================================

app.post('/api/shipping', async (req, res) => {
  try {
    const { productId, quantity, address } = req.body;
    
    // Basic shipping calculation
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
