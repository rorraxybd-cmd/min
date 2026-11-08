export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const db = env.retail || env.DB;
  if (!db) {
    return new Response(JSON.stringify({ success: false, error: "Database binding not found" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(request.url);
    
    // 1. GET Request
    if (request.method === "GET") {
      const customerId = url.searchParams.get("id") || url.searchParams.get("phone");
      const email = url.searchParams.get("email");

      let query = "SELECT * FROM customers";
      let params = [];
      let conditions = [];

      if (customerId) {
        conditions.push("(id = ? OR phone = ?)");
        params.push(customerId, customerId);
      }
      if (email) {
        conditions.push("email = ?");
        params.push(email);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY created_at DESC";
      const { results } = await db.prepare(query).bind(...params).all();

      return new Response(JSON.stringify({ success: true, data: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. POST Request (Create/Register Customer)
    if (request.method === "POST") {
      const body = await request.json();
      const {
        name, phone, email, address, password, role
      } = body;

      const insertQuery = `
        INSERT INTO customers (
          name, phone, email, address, password, role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      await db.prepare(insertQuery).bind(
        name || null, phone || null, email || null, 
        address || null, password || null, role || "customer"
      ).run();

      return new Response(JSON.stringify({ success: true, message: "Customer registered successfully!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. PUT Request (Update Customer)
    if (request.method === "PUT") {
      const body = await request.json();
      const targetId = body.id || url.searchParams.get("id");

      if (!targetId) {
        return new Response(JSON.stringify({ success: false, error: "Customer ID is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const updateQuery = `
        UPDATE customers 
        SET name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            address = COALESCE(?, address)
        WHERE id = ? OR phone = ?
      `;

      await db.prepare(updateQuery).bind(
        body.name || null, body.phone || null, 
        body.email || null, body.address || null, 
        targetId, targetId
      ).run();

      return new Response(JSON.stringify({ success: true, message: "Customer updated successfully!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. DELETE Request
    if (request.method === "DELETE") {
      const deleteId = url.searchParams.get("id") || url.pathname.split('/').pop();

      if (!deleteId || deleteId === "customer") {
        return new Response(JSON.stringify({ success: false, error: "Valid Customer ID is required for deletion" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const deleteQuery = `DELETE FROM customers WHERE id = ? OR phone = ?`;
      await db.prepare(deleteQuery).bind(deleteId, deleteId).run();

      return new Response(JSON.stringify({ success: true, message: "Customer deleted successfully!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
