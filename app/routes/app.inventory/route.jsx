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
import { processInventoryFiles } from "../../utils/ftp.server";
import { updateShopifyInventory } from "../../services/inventory.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Check if FTP is configured
  const ftpConfig = await prisma.ftpConfig.findUnique({
    where: { shop: session.shop },
  });
  
  // Get inventory sync status
  const inventorySyncs = await prisma.inventorySync.findMany({
    where: { shop: session.shop },
    orderBy: { syncedAt: 'desc' },
    take: 50
  });
  
  return json({
    ftpConfigured: !!ftpConfig,
    inventorySyncs,
  });
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const action = formData.get("action");
  
  if (action === "sync_inventory") {
    try {
      // Process inventory files from FTP
      const inventoryItems = await processInventoryFiles(session.shop);
      
      if (inventoryItems.length === 0) {
        return json({ 
          warning: "No inventory files found on FTP server" 
        });
      }
      
      // Update inventory in Shopify
      const results = await updateShopifyInventory(admin, inventoryItems);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      return json({ 
        success: true,
        message: `Processed ${results.length} inventory items: ${successCount} successful, ${failCount} failed`,
        results
      });
    } catch (error) {
      return json({ 
        error: `Failed to process inventory: ${error.message}` 
      }, { status: 500 });
    }
  }
  
  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Inventory() {
  const { ftpConfigured, inventorySyncs } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  
  const handleSyncInventory = () => {
    const formData = new FormData();
    formData.append("action", "sync_inventory");
    
    submit(formData, { method: "post" });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Prepare data for the table
  const rows = inventorySyncs.map((sync) => [
    sync.sku,
    sync.quantity.toString(),
    formatDate(sync.syncedAt),
    sync.syncStatus === "success" ? "Success" : "Failed",
    sync.errorMessage || "-",
  ]);
  
  return (
    <Page
      title="Inventory Synchronization"
      subtitle="Sync inventory data from FTP server to Shopify"
      primaryAction={
        ftpConfigured ? {
          content: "Sync Inventory",
          onAction: handleSyncInventory,
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
            <p>You need to configure FTP settings before syncing inventory.</p>
          </Banner>
        )}
        
        {isLoading && (
          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <InlineStack gap="400" align="center">
              <Spinner size="small" />
              <Text as="p">Processing inventory files...</Text>
            </InlineStack>
          </Box>
        )}
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Inventory Sync History
                </Text>
                
                {rows.length === 0 ? (
                  <EmptyState
                    heading="No inventory has been synced yet"
                    image=""
                  >
                    <p>Sync inventory to see its status here.</p>
                  </EmptyState>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["SKU", "Quantity", "Sync Date", "Status", "Error (if any)"]}
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
                    About Inventory Sync
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This app reads inventory files from the <code>/out</code> directory on your FTP server and updates your Shopify inventory.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Inventory files should be in text format with each line containing a SKU and quantity separated by a pipe character:
                  </Text>
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderWidth="025"
                    borderRadius="200"
                    borderColor="border"
                  >
                    <pre>
                      <code>
                        SKU1|100{"\n"}
                        SKU2|50{"\n"}
                        SKU3|75
                      </code>
                    </pre>
                  </Box>
                  <Text as="p" variant="bodyMd">
                    Click "Sync Inventory" to process any new inventory files.
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
