import prisma from '../db.server';
import { uploadOrderToFtp } from '../utils/ftp.server';

/**
 * Process a new Shopify order and send it to FTP
 * @param {string} shop - The shop identifier
 * @param {Object} admin - Shopify admin API client
 * @param {string} orderId - The Shopify order ID
 * @returns {Promise<Object>} - Result of the order processing
 */
export async function processOrder(shop, admin, orderId) {
  try {
    // Check if order was already processed
    const existingSync = await prisma.orderSync.findUnique({
      where: {
        shop_orderId: {
          shop,
          orderId
        }
      }
    });

    if (existingSync && existingSync.syncStatus === 'success') {
      return {
        success: true,
        message: `Order ${existingSync.orderNumber} was already processed successfully`,
        orderId,
        orderNumber: existingSync.orderNumber
      };
    }

    // Fetch order details from Shopify
    const response = await admin.graphql(
      `#graphql
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          email
          phone
          note
          createdAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          shippingAddress {
            firstName
            lastName
            company
            address1
            address2
            city
            province
            provinceCode
            zip
            country
            countryCode
            phone
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                name
                quantity
                sku
                variant {
                  id
                  sku
                  product {
                    id
                  }
                }
                product {
                  id
                }
              }
            }
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Order/${orderId}`
        }
      }
    );

    const responseData = await response.json();
    const shopifyOrder = responseData.data.order;
    
    if (!shopifyOrder) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Transform order data for FTP upload
    const orderNumber = shopifyOrder.name.replace('#', '');
    
    // Transform line items
    const lineItems = shopifyOrder.lineItems.edges.map(edge => {
      const node = edge.node;
      return {
        sku: node.sku || (node.variant?.sku) || `PRODUCT-${node.product?.id.split('/').pop()}`,
        quantity: node.quantity,
        product_id: node.product?.id.split('/').pop()
      };
    });

    // Prepare order data for FTP
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      email: shopifyOrder.email,
      phone: shopifyOrder.phone,
      note: shopifyOrder.note,
      created_at: shopifyOrder.createdAt,
      total_price: shopifyOrder.totalPriceSet?.shopMoney?.amount,
      currency: shopifyOrder.totalPriceSet?.shopMoney?.currencyCode,
      shipping_address: shopifyOrder.shippingAddress,
      line_items: lineItems
    };

    // Upload to FTP
    await uploadOrderToFtp(shop, orderData);

    return {
      success: true,
      message: `Order ${orderNumber} processed successfully`,
      orderId,
      orderNumber
    };
  } catch (error) {
    // Log the error
    console.error(`Error processing order ${orderId}:`, error);

    // Record the failure
    await prisma.orderSync.upsert({
      where: {
        shop_orderId: {
          shop,
          orderId
        }
      },
      update: {
        syncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error.message
      },
      create: {
        shop,
        orderId,
        orderNumber: `Unknown-${orderId}`,
        syncStatus: 'failed',
        errorMessage: error.message
      }
    });

    return {
      success: false,
      message: `Failed to process order: ${error.message}`,
      orderId
    };
  }
}

/**
 * Get order sync status for a shop
 * @param {string} shop - The shop identifier
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Order sync records
 */
export async function getOrderSyncStatus(shop, limit = 50) {
  return prisma.orderSync.findMany({
    where: { shop },
    orderBy: { syncedAt: 'desc' },
    take: limit
  });
}
