import { json } from "@remix-run/node";

export async function loader() {
  // Collect environment variables (excluding sensitive ones)
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    // Include API key but mask most of it for security
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY 
      ? `${process.env.SHOPIFY_API_KEY.substring(0, 4)}...${process.env.SHOPIFY_API_KEY.substring(process.env.SHOPIFY_API_KEY.length - 4)}`
      : null,
    // Don't include the full secret, just check if it exists
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? "Set (masked)" : "Not set",
    SCOPES: process.env.SCOPES,
    DATABASE_URL: process.env.DATABASE_URL ? "Set (masked)" : "Not set",
  };

  // Get server timestamp
  const timestamp = new Date().toISOString();

  // Return health check data
  return json({
    status: "ok",
    timestamp,
    environment: envVars,
    message: "API health check endpoint is working correctly"
  });
}
