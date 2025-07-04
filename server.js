require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*' // Or specify your frontend URL for security
}));
app.use(express.json());
app.use(express.static('public'));

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS, // Gmail App Password
  }
});

// GET /products
app.get('/products', (req, res) => {
  fs.readFile('./data/products.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading product file' });
    try {
      const products = JSON.parse(data);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Error parsing products JSON' });
    }
  });
});

// PATCH /products/:id/status
app.patch('/products/:id/status', (req, res) => {
  const productId = parseInt(req.params.id);
  const { status } = req.body;

  fs.readFile('./data/products.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading products file' });
    let products;
    try {
      products = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ message: 'Error parsing products file' });
    }
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) return res.status(404).json({ message: 'Product not found' });
    products[index].status = status;
    fs.writeFile('./data/products.json', JSON.stringify(products, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Error saving product status' });
      res.json({ message: 'Product status updated' });
    });
  });
});

// GET /orders
app.get('/orders', (req, res) => {
  fs.readFile('./data/orders.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading orders file' });
    try {
      const orders = JSON.parse(data);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error parsing orders JSON' });
    }
  });
});

// POST /orders
app.post('/orders', (req, res) => {
  const newOrder = req.body;
  fs.readFile('./data/orders.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading orders file' });
    let orders = [];
    try {
      orders = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ message: 'Error parsing orders file' });
    }
    newOrder.id = orders.length + 1;
    newOrder.date = new Date().toISOString();
    newOrder.status = 'pending';
    orders.push(newOrder);
    fs.writeFile('./data/orders.json', JSON.stringify(orders, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Error saving order' });
      res.status(201).json({ message: 'Order placed successfully', order: newOrder });
    });
  });
});

// PATCH /orders/:id/confirm
app.patch('/orders/:id/confirm', (req, res) => {
  const orderId = parseInt(req.params.id);
  fs.readFile('./data/orders.json', 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Error reading orders file' });
    let orders;
    try {
      orders = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).json({ message: 'Error parsing orders file' });
    }
    const index = orders.findIndex(order => order.id === orderId);
    if (index === -1) return res.status(404).json({ message: 'Order not found' });
    orders[index].status = 'confirmed';
    fs.writeFile('./data/orders.json', JSON.stringify(orders, null, 2), err => {
      if (err) return res.status(500).json({ message: 'Error updating order status' });
      const order = orders[index];
      // Send notification email
      const mailOptions = {
        from: `"Bintuu Signatures" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `Payment Confirmed for Order #${order.id}`,
        html: `
          <h2>Payment Confirmed</h2>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Name:</strong> ${order.name}</p>
          <p><strong>Product:</strong> ${order.product}</p>
          <p><strong>Quantity:</strong> ${order.quantity}</p>
          <p><strong>Payment Method:</strong> ${order.payment}</p>
          <p><strong>Delivery Address:</strong> ${order.address}</p>
          <p><strong>Date:</strong> ${order.date}</p>
        `
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending payment confirmation email:', error);
        } else {
          console.log('Payment confirmation email sent:', info.response);
        }
      });
      res.json({ message: 'Payment confirmed', order });
    });
  });
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
