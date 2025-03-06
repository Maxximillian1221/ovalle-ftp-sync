import { authenticate } from "../shopify.server";
import { processOrder } from "../services/orders.server";

export const action = async ({ request }) => {
  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  if (topic !== "ORDERS_CREATE") {
    return new Response("Incorrect webhook topic", { status: 400 });
  }

  try {
    // Extract order ID from the payload
    const orderId = payload.id.toString();
    
    // Process the order
    await processOrder(shop, admin, orderId);
    
    return new Response("Order processed successfully", { status: 200 });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return new Response(error.message, { status: 500 });
  }
};
