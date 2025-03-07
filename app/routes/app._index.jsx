import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
// Remove the polaris-icons import as it's causing build errors

export const loader = async ({ request }) => {
  try {
    console.log("app._index.jsx loader starting");
    const { session } = await authenticate.admin(request);
    console.log("Authentication successful, shop:", session.shop);
    
    // Default stats in case of error
    const defaultStats = {
      ftpConfigured: false,
      orders: { total: 0, success: 0, failed: 0 },
      inventory: { total: 0, success: 0, failed: 0 }
    };
    
    try {
      // Check if FTP is configured
      console.log("Checking FTP config");
      const ftpConfig = await prisma.ftpConfig.findUnique({
        where: { shop: session.shop },
      });
      console.log("FTP config:", ftpConfig ? "Found" : "Not found");
      
      // Get order sync stats
      console.log("Getting order sync stats");
      const orderSyncStats = await prisma.orderSync.groupBy({
        by: ['syncStatus'],
        _count: {
          id: true
        },
        where: {
          shop: session.shop
        }
      });
      console.log("Order sync stats:", orderSyncStats);
      
      // Get inventory sync stats
      console.log("Getting inventory sync stats");
      const inventorySyncStats = await prisma.inventorySync.groupBy({
        by: ['syncStatus'],
        _count: {
          id: true
        },
        where: {
          shop: session.shop
        }
      });
      console.log("Inventory sync stats:", inventorySyncStats);
      
      // Format stats
      const stats = {
        ftpConfigured: !!ftpConfig,
        orders: {
          total: orderSyncStats.reduce((sum, stat) => sum + stat._count.id, 0),
          success: orderSyncStats.find(stat => stat.syncStatus === 'success')?._count.id || 0,
          failed: orderSyncStats.find(stat => stat.syncStatus === 'failed')?._count.id || 0
        },
        inventory: {
          total: inventorySyncStats.reduce((sum, stat) => sum + stat._count.id, 0),
          success: inventorySyncStats.find(stat => stat.syncStatus === 'success')?._count.id || 0,
          failed: inventorySyncStats.find(stat => stat.syncStatus === 'failed')?._count.id || 0
        }
      };
      
      console.log("Stats formatted:", stats);
      return json({ stats });
    } catch (error) {
      console.error("Error in database queries:", error);
      return json({ stats: defaultStats, error: error.message });
    }
  } catch (error) {
    console.error("Error in loader:", error);
    throw error;
  }
};

export default function Index() {
  const { stats, error } = useLoaderData();
  
  console.log("Index component rendering with stats:", stats);
  if (error) {
    console.error("Error from loader:", error);
  }
  
  return (
    <Page>
      <TitleBar title="FTP Sync" />
      {error && (
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd" tone="critical">
              Error Loading Data
            </Text>
            <Text variant="bodyMd" as="p" tone="critical">
              {error}
            </Text>
          </BlockStack>
        </Card>
      )}
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to FTP Sync
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This app synchronizes your Shopify orders to an FTP server in XML format and updates your inventory from files on the FTP server.
                  </Text>
                </BlockStack>
                
                {!stats.ftpConfigured && (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="critical">
                      FTP is not configured yet. Please configure your FTP settings to start syncing.
                    </Text>
                    <Button url="/app/ftp-config" primary>
                      Configure FTP
                    </Button>
                  </BlockStack>
                )}
                
                {stats.ftpConfigured && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Sync Status
                    </Text>
                    
                    <InlineStack gap="500" wrap={false}>
                      <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor="border"
                        minWidth="200px"
                      >
                        <BlockStack gap="200" align="center">
                          <Icon source="OrdersMajor" color="base" />
                          <Text as="h4" variant="headingSm">
                            Orders
                          </Text>
                          <Text as="p" variant="bodyMd">
                            Total: {stats.orders.total}
                          </Text>
                          <Text as="p" variant="bodyMd" tone="success">
                            Success: {stats.orders.success}
                          </Text>
                          <Text as="p" variant="bodyMd" tone="critical">
                            Failed: {stats.orders.failed}
                          </Text>
                          <Button url="/app/orders" size="slim">
                            View Orders
                          </Button>
                        </BlockStack>
                      </Box>
                      
                      <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor="border"
                        minWidth="200px"
                      >
                        <BlockStack gap="200" align="center">
                          <Icon source="ProductsMajor" color="base" />
                          <Text as="h4" variant="headingSm">
                            Inventory
                          </Text>
                          <Text as="p" variant="bodyMd">
                            Total: {stats.inventory.total}
                          </Text>
                          <Text as="p" variant="bodyMd" tone="success">
                            Success: {stats.inventory.success}
                          </Text>
                          <Text as="p" variant="bodyMd" tone="critical">
                            Failed: {stats.inventory.failed}
                          </Text>
                          <Button url="/app/inventory" size="slim">
                            View Inventory
                          </Button>
                        </BlockStack>
                      </Box>
                    </InlineStack>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Links
                  </Text>
                  <List>
                    <List.Item>
                      <Link url="/app/ftp-config" removeUnderline>
                        FTP Configuration
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link url="/app/orders" removeUnderline>
                        Order Synchronization
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link url="/app/inventory" removeUnderline>
                        Inventory Synchronization
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    How It Works
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Orders:</strong> When a new order is created in Shopify, it is automatically sent to the <code>/in</code> directory on your FTP server in XML format.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Inventory:</strong> The app checks the <code>/out</code> directory on your FTP server for inventory files and updates your Shopify inventory accordingly.
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
