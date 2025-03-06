import * as ftp from 'basic-ftp';
import * as xml2js from 'xml2js';
import prisma from '../db.server';

/**
 * Connect to FTP server using stored credentials
 * @param {string} shop - The shop identifier
 * @returns {Promise<ftp.Client>} - Connected FTP client
 */
export async function connectToFtp(shop) {
  const ftpConfig = await prisma.ftpConfig.findUnique({
    where: { shop },
  });

  if (!ftpConfig) {
    throw new Error('FTP configuration not found');
  }

  const client = new ftp.Client();
  client.ftp.verbose = process.env.NODE_ENV === 'development';
  
  try {
    await client.access({
      host: ftpConfig.host,
      port: ftpConfig.port,
      user: ftpConfig.username,
      password: ftpConfig.password,
      secure: false // Set to true for FTPS
    });
    return client;
  } catch (error) {
    throw new Error(`FTP connection error: ${error.message}`);
  }
}

/**
 * Generate XML for order
 * @param {Object} order - Shopify order data
 * @returns {Promise<string>} - XML string
 */
export async function generateOrderXml(order) {
  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  
  // Create the base XML structure
  const orderData = {
    'ns0:Orders': {
      $: {
        'xmlns:ns0': 'http://www.internationaldatasystems.com/velocity/order'
      },
      'Header': [{
        'PartnerId': ['ACME'],
        'SenderId': ['ACME'],
        'ReceiverId': ['Demo']
      }],
      'Settings': [{
        'ShipToIdLookupUDF': [''],
        'ItemNbrLookupUDF': [''],
        'InventorySelectMethod': ['1'],
        'AllowBackorder': ['1'],
        'ReleaseOrders': ['0']
      }],
      'Order': [{
        'CustNbr': ['ACME'],
        'ShipToId': ['-1'],
        'ShipToIdLookupValue': [''],
        'ShipToName': [''],
        'ShipToCompany': [order.shipping_address?.company || ''],
        'ShipToAddrLine1': [order.shipping_address?.address1 || ''],
        'ShipToAddrLine2': [order.shipping_address?.address2 || ''],
        'ShipToCity': [order.shipping_address?.city || ''],
        'ShipToState': [order.shipping_address?.province_code || ''],
        'ShipToPostalCode': [order.shipping_address?.zip || ''],
        'ShipToCountry': [order.shipping_address?.country_code || ''],
        'ShipToPhone': [order.shipping_address?.phone || ''],
        'OrderPriorityId': ['2'],
        'OrderDate': [today],
        'RequestShipDate': [today],
        'ExpirationDate': [''],
        'PaymentTermId': ['-1'],
        'ShipMethodId': [''],
        'FOBId': ['-1'],
        'CustomerPoNbr': [order.order_number.toString()],
        'OrderUDFs': [{
          'OrderUDF': [{
            'Name': ['NOTE'],
            'Value': [`"${order.note || 'Shopify Order'}"` ]
          }]
        }],
        'LineItems': [{
          'LineItem': order.line_items.map(item => ({
            'ItemNbr': [item.sku || item.product_id.toString()],
            'QtyOrdered': [item.quantity.toString()],
            'LineItemUDFs': [{}]
          }))
        }]
      }]
    }
  };

  // Convert to XML
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });
  return builder.buildObject(orderData);
}

/**
 * Upload order XML to FTP server
 * @param {string} shop - The shop identifier
 * @param {Object} order - Shopify order data
 * @returns {Promise<boolean>} - Success status
 */
export async function uploadOrderToFtp(shop, order) {
  const client = await connectToFtp(shop);
  
  try {
    // Generate XML
    const xml = await generateOrderXml(order);
    
    // Create a temporary file
    const tempFilePath = `/tmp/order_${order.id}.xml`;
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, xml);
    
    // Ensure 'in' directory exists
    try {
      await client.ensureDir('in');
    } catch (error) {
      await client.mkdir('in');
    }
    
    // Upload the file
    await client.cd('in');
    await client.uploadFrom(tempFilePath, `order_${order.order_number}.xml`);
    
    // Clean up
    fs.unlinkSync(tempFilePath);
    
    // Record successful sync
    await prisma.orderSync.upsert({
      where: {
        shop_orderId: {
          shop,
          orderId: order.id
        }
      },
      update: {
        syncedAt: new Date(),
        syncStatus: 'success',
        errorMessage: null
      },
      create: {
        shop,
        orderId: order.id,
        orderNumber: order.order_number.toString(),
        syncStatus: 'success'
      }
    });
    
    return true;
  } catch (error) {
    // Record failed sync
    await prisma.orderSync.upsert({
      where: {
        shop_orderId: {
          shop,
          orderId: order.id
        }
      },
      update: {
        syncedAt: new Date(),
        syncStatus: 'failed',
        errorMessage: error.message
      },
      create: {
        shop,
        orderId: order.id,
        orderNumber: order.order_number.toString(),
        syncStatus: 'failed',
        errorMessage: error.message
      }
    });
    
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Download and process inventory files from FTP
 * @param {string} shop - The shop identifier
 * @returns {Promise<Array>} - Processed inventory items
 */
export async function processInventoryFiles(shop) {
  const client = await connectToFtp(shop);
  const processedItems = [];
  
  try {
    // Ensure 'out' directory exists
    try {
      await client.ensureDir('out');
    } catch (error) {
      await client.mkdir('out');
    }
    
    // Navigate to 'out' directory
    await client.cd('out');
    
    // List files
    const fileList = await client.list();
    const inventoryFiles = fileList.filter(file => 
      file.type === 1 && file.name.endsWith('.txt')
    );
    
    // Process each file
    for (const file of inventoryFiles) {
      // Download to temp file
      const tempFilePath = `/tmp/${file.name}`;
      await client.downloadTo(tempFilePath, file.name);
      
      // Read and process file
      const fs = require('fs');
      const fileContent = fs.readFileSync(tempFilePath, 'utf8');
      const lines = fileContent.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const [sku, quantityStr] = line.split('|');
        if (!sku || !quantityStr) continue;
        
        const quantity = parseInt(quantityStr.trim(), 10);
        if (isNaN(quantity)) continue;
        
        // Record inventory sync
        await prisma.inventorySync.upsert({
          where: {
            shop_sku: {
              shop,
              sku: sku.trim()
            }
          },
          update: {
            quantity,
            syncedAt: new Date(),
            syncStatus: 'success',
            errorMessage: null
          },
          create: {
            shop,
            sku: sku.trim(),
            quantity,
            syncStatus: 'success'
          }
        });
        
        processedItems.push({ sku: sku.trim(), quantity });
      }
      
      // Clean up
      fs.unlinkSync(tempFilePath);
      
      // Move processed file to backup or delete
      await client.rename(file.name, `processed_${Date.now()}_${file.name}`);
    }
    
    return processedItems;
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
}
