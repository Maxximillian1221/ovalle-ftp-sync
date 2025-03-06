import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
  BlockStack,
  Box,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // Get existing FTP config if any
  const ftpConfig = await prisma.ftpConfig.findUnique({
    where: { shop: session.shop },
  });
  
  return json({
    ftpConfig: ftpConfig || { host: "", port: 21, username: "", password: "" },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const host = formData.get("host");
  const port = parseInt(formData.get("port"), 10) || 21;
  const username = formData.get("username");
  const password = formData.get("password");
  
  // Validate inputs
  if (!host || !username || !password) {
    return json({ 
      error: "All fields are required except port (defaults to 21)" 
    }, { status: 400 });
  }
  
  try {
    // Save FTP config
    await prisma.ftpConfig.upsert({
      where: { shop: session.shop },
      update: {
        host,
        port,
        username,
        password,
      },
      create: {
        shop: session.shop,
        host,
        port,
        username,
        password,
      },
    });
    
    return json({ 
      success: true,
      message: "FTP configuration saved successfully" 
    });
  } catch (error) {
    return json({ 
      error: `Failed to save FTP configuration: ${error.message}` 
    }, { status: 500 });
  }
};

export default function FtpConfig() {
  const { ftpConfig } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";
  
  const [formState, setFormState] = useState({
    host: ftpConfig.host || "",
    port: ftpConfig.port || 21,
    username: ftpConfig.username || "",
    password: ftpConfig.password || "",
  });
  
  const [formStatus, setFormStatus] = useState({
    success: false,
    error: null,
  });
  
  const handleSubmit = (event) => {
    event.preventDefault();
    setFormStatus({ success: false, error: null });
    
    submit(event.currentTarget, { method: "post" });
  };
  
  const handleChange = (field) => (value) => {
    setFormState({ ...formState, [field]: value });
  };
  
  // Check for success or error messages from the action
  const actionData = navigation.formData ? Object.fromEntries(navigation.formData) : null;
  
  return (
    <Page
      title="FTP Configuration"
      subtitle="Configure FTP server credentials for order and inventory synchronization"
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  FTP Server Details
                </Text>
                
                {formStatus.success && (
                  <Banner title="Success" tone="success">
                    FTP configuration saved successfully
                  </Banner>
                )}
                
                {formStatus.error && (
                  <Banner title="Error" tone="critical">
                    {formStatus.error}
                  </Banner>
                )}
                
                <form onSubmit={handleSubmit}>
                  <FormLayout>
                    <TextField
                      label="FTP Host"
                      type="text"
                      value={formState.host}
                      onChange={handleChange("host")}
                      autoComplete="off"
                      helpText="Enter the FTP server hostname or IP address"
                      required
                    />
                    
                    <TextField
                      label="FTP Port"
                      type="number"
                      value={formState.port.toString()}
                      onChange={handleChange("port")}
                      autoComplete="off"
                      helpText="Default port is 21"
                    />
                    
                    <TextField
                      label="Username"
                      type="text"
                      value={formState.username}
                      onChange={handleChange("username")}
                      autoComplete="off"
                      required
                    />
                    
                    <TextField
                      label="Password"
                      type="password"
                      value={formState.password}
                      onChange={handleChange("password")}
                      autoComplete="off"
                      required
                    />
                    
                    <Button submit primary loading={isLoading}>
                      Save Configuration
                    </Button>
                  </FormLayout>
                </form>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    FTP Directory Structure
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This app requires the following directory structure on your FTP server:
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
                        /in  - For order XML files{"\n"}
                        /out - For inventory text files
                      </code>
                    </pre>
                  </Box>
                  <Text as="p" variant="bodyMd">
                    The app will create these directories if they don't exist.
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
