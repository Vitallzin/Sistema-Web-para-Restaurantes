import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-e0724fe2/health", (c) => {
  return c.json({ status: "ok" });
});

// Restaurant signup (requires payment)
app.post("/make-server-e0724fe2/signup", async (c) => {
  try {
    const { email, password, restaurantName, paymentToken } = await c.req.json();

    if (!email || !password || !restaurantName || !paymentToken) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Simulate payment verification (in production, integrate with payment gateway)
    if (paymentToken !== "PAID") {
      return c.json({ error: "Payment required to create account" }, 402);
    }

    // Check if email already exists
    const existingId = await kv.get(`restaurant:email:${email}`);
    if (existingId) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const restaurantId = crypto.randomUUID();
    const restaurant = {
      id: restaurantId,
      email,
      password, // In production, hash this!
      name: restaurantName,
      paid: true,
      managerPassword: "", // Will be set on first login
      createdAt: Date.now(),
    };

    await kv.set(`restaurant:${restaurantId}`, restaurant);
    await kv.set(`restaurant:email:${email}`, restaurantId);

    // Initialize with default tables (1-10)
    for (let i = 1; i <= 10; i++) {
      await kv.set(`table:${restaurantId}:${i}`, { number: i, orders: [] });
    }

    return c.json({ success: true, restaurantId });
  } catch (error) {
    console.error("Error during restaurant signup:", error);
    return c.json({ error: `Signup failed: ${error}` }, 500);
  }
});

// Restaurant login
app.post("/make-server-e0724fe2/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Missing email or password" }, 400);
    }

    const restaurantId = await kv.get(`restaurant:email:${email}`);
    if (!restaurantId) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const restaurant = await kv.get(`restaurant:${restaurantId}`);
    if (!restaurant || restaurant.password !== password) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    return c.json({ 
      success: true, 
      restaurantId,
      restaurantName: restaurant.name,
      hasManagerPassword: !!restaurant.managerPassword
    });
  } catch (error) {
    console.error("Error during login:", error);
    return c.json({ error: `Login failed: ${error}` }, 500);
  }
});

// Set manager password
app.post("/make-server-e0724fe2/set-manager-password", async (c) => {
  try {
    const { restaurantId, password } = await c.req.json();

    const restaurant = await kv.get(`restaurant:${restaurantId}`);
    if (!restaurant) {
      return c.json({ error: "Restaurant not found" }, 404);
    }

    restaurant.managerPassword = password;
    await kv.set(`restaurant:${restaurantId}`, restaurant);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error setting manager password:", error);
    return c.json({ error: `Failed to set password: ${error}` }, 500);
  }
});

// Verify manager password
app.post("/make-server-e0724fe2/verify-manager", async (c) => {
  try {
    const { restaurantId, password } = await c.req.json();

    const restaurant = await kv.get(`restaurant:${restaurantId}`);
    if (!restaurant) {
      return c.json({ error: "Restaurant not found" }, 404);
    }

    if (restaurant.managerPassword !== password) {
      return c.json({ error: "Invalid manager password" }, 401);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error verifying manager:", error);
    return c.json({ error: `Verification failed: ${error}` }, 500);
  }
});

// Get all tables
app.get("/make-server-e0724fe2/tables/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const tables = await kv.getByPrefix(`table:${restaurantId}:`);
    
    return c.json({ tables: tables || [] });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return c.json({ error: `Failed to fetch tables: ${error}` }, 500);
  }
});

// Add order to table
app.post("/make-server-e0724fe2/orders", async (c) => {
  try {
    const { restaurantId, tableNumber, items } = await c.req.json();

    const orderId = crypto.randomUUID();
    const order = {
      id: orderId,
      restaurantId,
      tableNumber,
      items, // [{productId, name, quantity, price, category}]
      status: "pending", // pending, ready, completed
      timestamp: Date.now(),
    };

    await kv.set(`order:${restaurantId}:${orderId}`, order);

    // Update table
    const table = await kv.get(`table:${restaurantId}:${tableNumber}`);
    if (table) {
      table.orders = table.orders || [];
      table.orders.push(orderId);
      await kv.set(`table:${restaurantId}:${tableNumber}`, table);
    }

    // Update inventory
    for (const item of items) {
      const product = await kv.get(`product:${restaurantId}:${item.productId}`);
      if (product && product.ingredients) {
        for (const ingredient of product.ingredients) {
          const inventoryKey = `inventory:${restaurantId}:${ingredient.name}`;
          const current = await kv.get(inventoryKey);
          if (current) {
            current.quantity -= ingredient.quantity * item.quantity;
            await kv.set(inventoryKey, current);
          }
        }
      }
    }

    return c.json({ success: true, orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({ error: `Failed to create order: ${error}` }, 500);
  }
});

// Get all pending orders for kitchen
app.get("/make-server-e0724fe2/kitchen-orders/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const allOrders = await kv.getByPrefix(`order:${restaurantId}:`);
    
    // Filter only food orders that are pending
    const kitchenOrders = allOrders.filter(order => 
      order.status === "pending" && 
      order.items.some(item => item.category === "food")
    );

    return c.json({ orders: kitchenOrders });
  } catch (error) {
    console.error("Error fetching kitchen orders:", error);
    return c.json({ error: `Failed to fetch kitchen orders: ${error}` }, 500);
  }
});

// Mark order as ready
app.put("/make-server-e0724fe2/orders/:orderId/ready", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const { restaurantId } = await c.req.json();

    const order = await kv.get(`order:${restaurantId}:${orderId}`);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    order.status = "ready";
    await kv.set(`order:${restaurantId}:${orderId}`, order);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking order as ready:", error);
    return c.json({ error: `Failed to update order: ${error}` }, 500);
  }
});

// Complete order (remove from kitchen)
app.delete("/make-server-e0724fe2/orders/:orderId", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const { restaurantId } = await c.req.json();

    await kv.del(`order:${restaurantId}:${orderId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing order:", error);
    return c.json({ error: `Failed to complete order: ${error}` }, 500);
  }
});

// Update order item quantity
app.put("/make-server-e0724fe2/orders/:orderId/items", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const { restaurantId, itemIndex, quantity } = await c.req.json();

    const order = await kv.get(`order:${restaurantId}:${orderId}`);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (quantity === 0) {
      order.items.splice(itemIndex, 1);
    } else {
      order.items[itemIndex].quantity = quantity;
    }

    await kv.set(`order:${restaurantId}:${orderId}`, order);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating order item:", error);
    return c.json({ error: `Failed to update order item: ${error}` }, 500);
  }
});

// Get table orders
app.get("/make-server-e0724fe2/tables/:restaurantId/:tableNumber/orders", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const tableNumber = parseInt(c.req.param("tableNumber"));

    const table = await kv.get(`table:${restaurantId}:${tableNumber}`);
    if (!table) {
      return c.json({ orders: [] });
    }

    const orders = [];
    for (const orderId of (table.orders || [])) {
      const order = await kv.get(`order:${restaurantId}:${orderId}`);
      if (order) {
        orders.push(order);
      }
    }

    return c.json({ orders });
  } catch (error) {
    console.error("Error fetching table orders:", error);
    return c.json({ error: `Failed to fetch table orders: ${error}` }, 500);
  }
});

// Close table (complete payment)
app.post("/make-server-e0724fe2/tables/:restaurantId/:tableNumber/close", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const tableNumber = parseInt(c.req.param("tableNumber"));

    const table = await kv.get(`table:${restaurantId}:${tableNumber}`);
    if (!table) {
      return c.json({ error: "Table not found" }, 404);
    }

    // Delete all orders for this table
    for (const orderId of (table.orders || [])) {
      await kv.del(`order:${restaurantId}:${orderId}`);
    }

    // Clear table orders
    table.orders = [];
    await kv.set(`table:${restaurantId}:${tableNumber}`, table);

    // Record sale
    const today = new Date().toISOString().split('T')[0];
    const salesKey = `sales:${restaurantId}:${today}`;
    let sales = await kv.get(salesKey);
    if (!sales) {
      sales = { date: today, total: 0, count: 0 };
    }

    const { subtotal } = await c.req.json();
    sales.total += subtotal * 1.1; // Include 10% service fee
    sales.count += 1;
    await kv.set(salesKey, sales);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error closing table:", error);
    return c.json({ error: `Failed to close table: ${error}` }, 500);
  }
});

// Get all products
app.get("/make-server-e0724fe2/products/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const products = await kv.getByPrefix(`product:${restaurantId}:`);
    
    return c.json({ products: products || [] });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: `Failed to fetch products: ${error}` }, 500);
  }
});

// Add product
app.post("/make-server-e0724fe2/products", async (c) => {
  try {
    const { restaurantId, name, price, category, ingredients } = await c.req.json();

    const productId = crypto.randomUUID();
    const product = {
      id: productId,
      name,
      price,
      category, // food or drink
      ingredients: ingredients || [], // [{name, quantity, unit}]
    };

    await kv.set(`product:${restaurantId}:${productId}`, product);

    return c.json({ success: true, productId });
  } catch (error) {
    console.error("Error adding product:", error);
    return c.json({ error: `Failed to add product: ${error}` }, 500);
  }
});

// Delete product
app.delete("/make-server-e0724fe2/products/:productId", async (c) => {
  try {
    const productId = c.req.param("productId");
    const { restaurantId } = await c.req.json();

    await kv.del(`product:${restaurantId}:${productId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: `Failed to delete product: ${error}` }, 500);
  }
});

// Get inventory
app.get("/make-server-e0724fe2/inventory/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const inventory = await kv.getByPrefix(`inventory:${restaurantId}:`);
    
    return c.json({ inventory: inventory || [] });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return c.json({ error: `Failed to fetch inventory: ${error}` }, 500);
  }
});

// Update inventory
app.post("/make-server-e0724fe2/inventory", async (c) => {
  try {
    const { restaurantId, ingredient, quantity, unit } = await c.req.json();

    const inventoryKey = `inventory:${restaurantId}:${ingredient}`;
    let current = await kv.get(inventoryKey);
    
    if (!current) {
      current = { ingredient, quantity: 0, unit };
    }
    
    current.quantity += quantity;
    await kv.set(inventoryKey, current);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating inventory:", error);
    return c.json({ error: `Failed to update inventory: ${error}` }, 500);
  }
});

// Get sales report
app.get("/make-server-e0724fe2/sales/:restaurantId", async (c) => {
  try {
    const restaurantId = c.req.param("restaurantId");
    const sales = await kv.getByPrefix(`sales:${restaurantId}:`);
    
    return c.json({ sales: sales || [] });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return c.json({ error: `Failed to fetch sales: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
