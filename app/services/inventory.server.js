import prisma from '../db.server';

/**
 * Update inventory in Shopify based on processed inventory data
 * @param {Object} admin - Shopify admin API client
 * @param {Array} inventoryItems - Array of inventory items with sku and quantity
 * @returns {Promise<Array>} - Results of inventory updates
 */
export async function updateShopifyInventory(admin, inventoryItems) {
  if (!inventoryItems || inventoryItems.length === 0) {
    return [];
  }

  const results = [];

  for (const item of inventoryItems) {
    try {
      // First, find the product variant by SKU
      const variantsResponse = await admin.graphql(
        `#graphql
        query getVariantBySku($query: String!) {
          productVariants(first: 1, query: $query) {
            edges {
              node {
                id
                inventoryItem {
                  id
                  inventoryLevels(first: 1) {
                    edges {
                      node {
                        id
                        available
                        locationId
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
        {
          variables: {
            query: `sku:${item.sku}`,
          },
        }
      );

      const variantsData = await variantsResponse.json();
      const variants = variantsData.data.productVariants.edges;

      if (variants.length === 0) {
        results.push({
          sku: item.sku,
          success: false,
          message: 'Variant not found',
        });
        continue;
      }

      const variant = variants[0].node;
      const inventoryItem = variant.inventoryItem;
      
      if (!inventoryItem || !inventoryItem.inventoryLevels.edges.length) {
        results.push({
          sku: item.sku,
          success: false,
          message: 'Inventory item or level not found',
        });
        continue;
      }

      const inventoryLevel = inventoryItem.inventoryLevels.edges[0].node;
      
      // Update inventory level
      const updateResponse = await admin.graphql(
        `#graphql
        mutation inventorySetQuantity($inventoryLevelId: ID!, $availableDelta: Int!) {
          inventoryAdjustQuantity(input: {
            inventoryLevelId: $inventoryLevelId,
            availableDelta: $availableDelta
          }) {
            inventoryLevel {
              id
              available
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            inventoryLevelId: inventoryLevel.id,
            availableDelta: item.quantity - inventoryLevel.available,
          },
        }
      );

      const updateData = await updateResponse.json();
      
      if (updateData.data.inventoryAdjustQuantity.userErrors.length > 0) {
        results.push({
          sku: item.sku,
          success: false,
          message: updateData.data.inventoryAdjustQuantity.userErrors[0].message,
        });
      } else {
        results.push({
          sku: item.sku,
          success: true,
          newQuantity: updateData.data.inventoryAdjustQuantity.inventoryLevel.available,
        });
      }
    } catch (error) {
      results.push({
        sku: item.sku,
        success: false,
        message: error.message,
      });
    }
  }

  return results;
}
