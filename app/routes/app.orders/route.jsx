import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  Box,
  Banner,
  DataTable,
  EmptyState,
  Spinner,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { processOrder, getOrderSyncStatus } from "../../services/orders.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Check if FTP is configured
  const ftpConfig = await prisma.ftpConfig.findUnique({
    where: { shop: session.shop },
  });
  
  // Get order sync status
  const orderSyncs = await getOrderSyncStatus(session.shop);
  
  return json({
    ftpConfigured: !!ftpConfig,
    orderSyncs,
  });
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const action = formData.get("action");
  
  if (action === "sync_order") {
    const orderId = formData.get("orderId");
    
    if (!orderId) {
      return json({ error: "Order ID is required" }, { status: 400 });
    }
    
    try {
      const result = await processOrder(session.shop, admin, orderId);
      
      if (result.success) {
        return json({ 
          success: true,
          message: result.message,
          orderId: result.orderId,
          orderNumber: result.orderNumber
        });
      } else {
        return json({ 
          error: result.message,
          orderId: result.orderId
        }, { status: 500 });
      }
    } catch (error) {
      return json({ 
        error: `Failed to process order: ${error.message}` 
      }, { status: 500 });
    }
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Orders() {
  const { ftpConfigured, orderSyncs } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  
  const handleSyncOrder = () => {
    // Show a prompt to enter the order ID
    const orderId = window.prompt("Enter the Shopify Order ID to sync:");
    
    if (orderId) {
      const formData = new FormData();
      formData.append("action", "sync_order");
      formData.append("orderId", orderId);
      
      submit(formData, { method: "post" });
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Prepare data for the table
  const rows = orderSyncs.map((sync) => [
    sync.orderNumber,
    formatDate(sync.syncedAt),
    sync.syncStatus === "success" ? "Success" : "Failed",
    sync.errorMessage || "-",
  ]);
  
  return (
    <Page
      title="Order Synchronization"
      subtitle="View order sync status and manually sync orders"
      primaryAction={
        ftpConfigured ? {
          content: "Sync Order",
          onAction: handleSyncOrder,
          disabled: isLoading,
        } : undefined
      }
    >
      <BlockStack gap="500">
        {!ftpConfigured && (
          <Banner
            title="FTP Not Configured"
            tone="warning"
            action={{ content: "Configure FTP", url: "/app/ftp-config" }}
          >
            <p>You need to configure FTP settings before syncing orders.</p>
          </Banner>
        )}
        
        {isLoading && (
          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineStack gap="400" align="center">
              <Spinner size="small" />
              <Text as="p">Processing order...</Text>
            </InlineStack>
          </Box>
        )}
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Order Sync History
                </Text>
                
                {rows.length === 0 ? (
                  <EmptyState
                    heading="No orders have been synced yet"
                    image=""
                  >
                    <p>Sync an order to see its status here.</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text"]}
                    headings={["Order #", "Sync Date", "Status", "Error (if any)"]}
                    rows={rows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    About Order Sync
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This app syncs Shopify orders to your FTP server in the specified XML format.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Orders are placed in the <code>/in</code> directory on your FTP server.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    You can manually sync an order by clicking the "Sync Order" button and entering the Shopify Order ID.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
