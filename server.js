const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());
app.use('/static', express.static('static'));

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const DATABASE_URL = process.env.DATABASE_URL;

// ============================================================
// POSTGRESQL CONNECTION
// ============================================================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create orders table if not exists
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        shipping_address TEXT,
        items JSONB,
        subtotal DECIMAL(10,2),
        shipping_cost DECIMAL(10,2),
        total DECIMAL(10,2),
        printify_order_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database init error:', error.message);
  }
};

initDb();

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
// PUBLISH PRODUCT ENDPOINT
// ============================================================
app.post('/api/publish-product', async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    console.log(`📤 Publishing product ${productId}...`);

    const response = await axios.post(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/products/${productId}/publish.json`,
      {
        title: true,
        description: true,
        images: true,
        variants: true,
        tags: true
      },
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Product ${productId} published successfully!`);
    res.json({
      success: true,
      message: 'Product published successfully!',
      data: response.data
    });

  } catch (error) {
    console.error('❌ Publish error:', error.message);
    res.status(500).json({
      error: 'Failed to publish product',
      details: error.response?.data || error.message
    });
  }
});

// ============================================================
// WEBHOOK ENDPOINTS
// ============================================================
app.get('/api/webhooks/publish', (req, res) => {
  res.status(200).send('Webhook endpoint is active');
});

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

app.get('/register-webhook', async (req, res) => {
  try {
    const listResponse = await axios.get(
      `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/webhooks.json`,
      {
        headers: {
          'Authorization': `Bearer ${PRINTIFY_API_KEY}`
        }
      }
    );

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
// ORDER ENDPOINT - MODIFIED (saves to DB + sends to Printify)
// ============================================================
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customer,
      shipping,
      items,
      subtotal,
      shippingCost,
      total,
      testMode = true // Default to test mode for training
    } = req.body;

    // 1. Generate a unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 2. Save order to PostgreSQL
    const query = `
      INSERT INTO orders (
        order_id, customer_name, customer_email, customer_phone,
        shipping_address, items, subtotal, shipping_cost, total, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const values = [
      orderId,
      customer?.name || 'Test Customer',
      customer?.email || 'test@example.com',
      customer?.phone || '1234567890',
      JSON.stringify(shipping || {}),
      JSON.stringify(items || []),
      subtotal || 0,
      shippingCost || 0,
      total || 0,
      testMode ? 'test' : 'pending'
    ];

    const result = await pool.query(query, values);
    const dbId = result.rows[0].id;

    console.log(`📦 Order saved to DB with ID: ${dbId}, Order ID: ${orderId}`);

    // 3. Send to Printify (if NOT test mode or if we want to train)
    let printifyResponse = null;
    if (!testMode) {
      try {
        // Build Printify order payload
        const printifyPayload = {
          external_id: orderId,
          label: orderId,
          line_items: items.map(item => ({
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity || 1,
            external_id: `${orderId}-${item.productId}`
          })),
          shipping_method: 1, // 1 = standard, 2 = express
          send_shipping_notification: true,
          address_to: {
            first_name: customer?.name?.split(' ')[0] || 'Test',
            last_name: customer?.name?.split(' ').slice(1).join(' ') || 'Customer',
            email: customer?.email || 'test@example.com',
            phone: customer?.phone || '1234567890',
            country: shipping?.country || 'US',
            region: shipping?.state || '',
            address1: shipping?.street || '123 Test St',
            address2: '',
            city: shipping?.city || 'New York',
            zip: shipping?.zip || '10001'
          }
        };

        printifyResponse = await axios.post(
          `https://api.printify.com/v1/shops/${PRINTIFY_SHOP_ID}/orders.json`,
          printifyPayload,
          {
            headers: {
              'Authorization': `Bearer ${PRINTIFY_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✅ Order sent to Printify: ${printifyResponse.data.id}`);

        // Update order with Printify order ID
        await pool.query(
          `UPDATE orders SET printify_order_id = $1, status = $2 WHERE order_id = $3`,
          [printifyResponse.data.id, 'sent_to_printify', orderId]
        );

      } catch (printifyError) {
        console.error('❌ Printify order error:', printifyError.message);
        // Don't fail the whole request, just log it
      }
    } else {
      console.log('🧪 Test mode: Order saved to DB but not sent to Printify');
    }

    // 4. Return response
    res.json({
      success: true,
      message: testMode ? 'Order saved (test mode)' : 'Order created and sent to Printify',
      orderId: orderId,
      dbId: dbId,
      printifyOrderId: printifyResponse?.data?.id || null,
      testMode: testMode
    });

  } catch (error) {
    console.error('❌ Order error:', error.message);
    res.status(500).json({
      error: 'Failed to create order',
      details: error.message
    });
  }
});

// ============================================================
// GET ORDER BY ID (for tracking page)
// ============================================================
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      `SELECT * FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      success: true,
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Royal Cartouche backend running on port ${PORT}`);
});
