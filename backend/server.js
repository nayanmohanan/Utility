// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON bodies

// PostgreSQL connection setup
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
          .replace('-', '')
          .replace('_', '');
      });
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

// --- API ROUTES ---

// GET Bill Details (Electricity or Water)
app.get('/api/bills/:type', async (req, res) => {
  const { type } = req.params;
  const { consumerId, phone } = req.query;

  if (!['electricity', 'water'].includes(type) || !consumerId || !phone) {
    return res.status(400).json({ error: 'Invalid request parameters.' });
  }

  const tableName = type === 'electricity' ? 'electricity_bills' : 'water_bills';
  
  try {
    const query = `SELECT * FROM ${tableName} WHERE consumer_id = $1 AND phone = $2`;
    const result = await pool.query(query, [consumerId, phone]);

    if (result.rows.length > 0) {
      res.json(toCamelCase(result.rows[0]));
    } else {
      res.status(404).json({ error: 'Bill not found.' });
    }
  } catch (err) {
    console.error('Error fetching bill:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET Gas Booking Details
app.get('/api/gas', async (req, res) => {
    const { phone } = req.query; // Provider is not used in the query but could be for multi-provider logic
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required.' });
    }
    try {
        const query = `SELECT * FROM gas_details WHERE phone = $1`;
        const result = await pool.query(query, [phone]);
        if (result.rows.length > 0) {
            res.json(toCamelCase(result.rows[0]));
        } else {
            res.status(404).json({ error: 'Gas details not found.' });
        }
    } catch (err) {
        console.error('Error fetching gas details:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST Process Payment
app.post('/api/payment', async (req, res) => {
  const { consumerId, amount, service, phone } = req.body;
  
  if (!consumerId || !amount || !service || !phone) {
    return res.status(400).json({ error: 'Missing required payment information.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert into transactions table
    const transactionId = `TXN${Date.now()}`;
    const insertTransactionQuery = `
      INSERT INTO transactions (transaction_id, service, consumer_id, phone, amount, status, transaction_date)
      VALUES ($1, $2, $3, $4, $5, 'SUCCESS', CURRENT_DATE)
    `;
    await client.query(insertTransactionQuery, [transactionId, service, consumerId, phone, amount]);

    // 2. Update bill status if it's electricity or water
    if (['Electricity', 'Water'].includes(service)) {
        const tableName = service === 'Electricity' ? 'electricity_bills' : 'water_bills';
        const updateBillQuery = `UPDATE ${tableName} SET status = 'PAID' WHERE consumer_id = $1`;
        await client.query(updateBillQuery, [consumerId]);
    }
    
    await client.query('COMMIT'); // Commit transaction
    res.status(201).json({ transactionId, status: 'SUCCESS' });

  } catch (err) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error processing payment:', err);
    res.status(500).json({ error: 'Internal server error during payment.' });
  } finally {
    client.release();
  }
});

// GET Transaction History
app.get('/api/transactions', async (req, res) => {
    const { phone, consumerId } = req.query;
    if (!phone || !consumerId) {
        return res.status(400).json({ error: 'Phone and Consumer ID are required.' });
    }
    try {
        const query = `
          SELECT *, transaction_date as date 
          FROM transactions 
          WHERE phone = $1 AND consumer_id = $2 
          ORDER BY transaction_date DESC
        `;
        const result = await pool.query(query, [phone, consumerId]);
        res.json(toCamelCase(result.rows));
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


// Start server
app.listen(port, () => {
  console.log(`WardConnect backend server listening at http://localhost:${port}`);
});
