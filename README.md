# Shopify FTP Sync App

A Shopify app that synchronizes orders to an FTP server in XML format and updates inventory from files on the FTP server.

## Features

- **Order Synchronization**: Automatically sends new Shopify orders to an FTP server in XML format
- **Inventory Synchronization**: Reads inventory files from the FTP server and updates Shopify inventory
- **FTP Configuration**: Easy setup of FTP server credentials
- **Order History**: View the status of order synchronizations
- **Inventory History**: View the status of inventory synchronizations

## Technical Stack

- **Framework**: [Remix](https://remix.run)
- **Database**: [Prisma](https://www.prisma.io/) with PostgreSQL (Neon)
- **Deployment**: [Vercel](https://vercel.com)
- **UI**: [Polaris](https://polaris.shopify.com/)
- **FTP Client**: [basic-ftp](https://github.com/patrickjuchli/basic-ftp)
- **XML Processing**: [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)

## Setup

### Prerequisites

1. **Node.js**: v18.20 or higher
2. **Shopify Partner Account**: To create and manage your app
3. **FTP Server**: With access credentials
4. **Neon PostgreSQL Database**: For data storage
5. **Vercel Account**: For deployment

### Local Development

1. Clone the repository
2. Install dependencies:

```shell
npm install
```

3. Update the `.env` file with your credentials:

```
# Neon PostgreSQL Database
DATABASE_URL="postgresql://user:password@your-neon-db-host/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@your-neon-db-host/neondb?sslmode=require"

# Shopify API
SHOPIFY_API_KEY="your-shopify-api-key"
SHOPIFY_API_SECRET="your-shopify-api-secret"
SCOPES="write_products,write_orders,read_inventory"

# Host
HOST="your-vercel-app-url.vercel.app"
```

4. Run the development server:

```shell
npm run dev
```

### Deployment to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Configure the environment variables in Vercel:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `DIRECT_URL`: Your Neon PostgreSQL direct connection string
   - `SHOPIFY_API_KEY`: Your Shopify API key
   - `SHOPIFY_API_SECRET`: Your Shopify API secret
   - `SCOPES`: `write_products,write_orders,read_inventory`
   - `HOST`: Your Vercel app URL
4. Deploy your app

## FTP Server Requirements

The app expects the following directory structure on your FTP server:

```
/in  - For order XML files
/out - For inventory text files
```

If these directories don't exist, the app will attempt to create them.

### Inventory File Format

Inventory files should be placed in the `/out` directory on your FTP server. They should be text files with each line containing a SKU and quantity separated by a pipe character:

```
SKU1|100
SKU2|50
SKU3|75
```

## Order XML Format

Orders are sent to the `/in` directory on your FTP server in the following XML format:

```xml
<?xml version="1.0"?>
<ns0:Orders xmlns:ns0="http://www.internationaldatasystems.com/velocity/order">
 <Header xmlns="">
  <PartnerId>ACME</PartnerId>
  <SenderId>ACME</SenderId>
  <ReceiverId>Demo</ReceiverId>
 </Header>
 <Settings xmlns="">
  <ShipToIdLookupUDF/>
  <ItemNbrLookupUDF/>
  <InventorySelectMethod>1</InventorySelectMethod>
  <AllowBackorder>1</AllowBackorder>
  <ReleaseOrders>0</ReleaseOrders>
 </Settings>
 <Order xmlns="">
  <CustNbr>ACME</CustNbr>
  <ShipToId>-1</ShipToId>
  <ShipToIdLookupValue/>
  <ShipToName/>
  <ShipToCompany>Best Buy</ShipToCompany>
  <ShipToAddrLine1>1701 N Central Ave</ShipToAddrLine1>
  <ShipToAddrLine2></ShipToAddrLine2>
  <ShipToCity>Los Angeles</ShipToCity>
  <ShipToState>CA</ShipToState>
  <ShipToPostalCode>90059</ShipToPostalCode>
  <ShipToCountry>USA</ShipToCountry>
  <ShipToPhone>999-999-9999</ShipToPhone>
  <OrderPriorityId>2</OrderPriorityId>
  <OrderDate>CURR_DATE</OrderDate>
  <RequestShipDate>08/01/2017</RequestShipDate>
  <ExpirationDate/>
  <PaymentTermId>-1</PaymentTermId>
  <ShipMethodId/>
  <FOBId>-1</FOBId>
  <CustomerPoNbr>655880-08</CustomerPoNbr>
  <OrderUDFs>
   <OrderUDF>
    <Name>NOTE</Name>
    <Value>"UPS ACCT# 6AW826 GROUND"</Value>
   </OrderUDF>
  </OrderUDFs>
  <LineItems>
   <LineItem>
    <ItemNbr>PT-60HDTV</ItemNbr>
    <QtyOrdered>4</QtyOrdered>
    <LineItemUDFs>
    </LineItemUDFs>
   </LineItem>
   <!-- Additional line items -->
  </LineItems>
 </Order>
</ns0:Orders>
```

## App Pages

- **Home**: Overview of the app with sync statistics
- **FTP Configuration**: Set up your FTP server credentials
- **Orders**: View order sync history and manually sync orders
- **Inventory**: View inventory sync history and manually sync inventory

## Webhooks

The app registers a webhook for the `ORDERS_CREATE` event to automatically sync new orders to the FTP server.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
