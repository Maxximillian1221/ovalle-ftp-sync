import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  // Add console logs for debugging
  console.log("App component rendering");
  console.log("API Key:", apiKey);
  console.log("Current URL:", window.location.href);

  // Check for URL mismatch and handle it
  useEffect(() => {
    const currentUrl = window.location.href;
    // If we detect we're on an old URL, redirect to the new one
    if (currentUrl.includes('ovalle-ftp-sync-r6x88e9uj-iulians-projects-3e3f2a9b.vercel.app') ||
        currentUrl.includes('ovalle-ftp-sync-34zf9i0ki-iulians-projects-3e3f2a9b.vercel.app')) {
      console.log("Detected old URL, redirecting to new URL");
      window.location.href = currentUrl.replace(
        /ovalle-ftp-sync-(r6x88e9uj|34zf9i0ki)-iulians-projects-3e3f2a9b\.vercel\.app/,
        'ovalle-ftp-sync-iulians-projects-3e3f2a9b.vercel.app'
      );
      return;
    }
  }, []);

  // Handle potential app bridge errors
  useEffect(() => {
    window.addEventListener('error', (event) => {
      console.error('Caught error:', event.error);
      if (event.error && event.error.message && event.error.message.includes('shopify-reload must be same-origin')) {
        console.log('Detected app-bridge origin error, attempting to fix...');
        // Force reload the page to clear any cached state
        window.location.reload();
      }
    });
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/ftp-config">FTP Configuration</Link>
        <Link to="/app/orders">Orders</Link>
        <Link to="/app/inventory">Inventory</Link>
      </NavMenu>
      <div style={{ padding: '20px' }}>
        <h1>FTP Sync App</h1>
        <p>If you can see this text, the app is loading but the Outlet content might be failing.</p>
        <Outlet />
      </div>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
