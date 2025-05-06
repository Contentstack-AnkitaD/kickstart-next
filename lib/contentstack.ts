// Importing Contentstack SDK and specific types for region and query operations
import contentstack, { QueryOperation } from "@contentstack/delivery-sdk";
// Importing Contentstack Live Preview utilities and stack SDK 
import ContentstackLivePreview, { IStackSdk } from "@contentstack/live-preview-utils";
// Importing the Page type definition 
import { Page } from "./types";
// helper functions from private package to retrieve Contentstack endpoints in a convienient way
import { getContentstackEndpoints, getRegionForString, Region } from "@timbenniks/contentstack-endpoints";

// Get region or handle custom development regions
let region: Region;
let endpoints: any;

const csRegion = process.env.NEXT_PUBLIC_CONTENTSTACK_REGION as Region;

if (!csRegion) {
  throw new Error("NEXT_PUBLIC_CONTENTSTACK_REGION is not set. Please define the region in your environment variables.");
}

// Check if it's a standard (EU/US) or development region
// Standard regions are "eu" or "us", development regions are expected to be "dev22", "dev14", "stag", etc.
const isStandardRegion = ['eu', 'us'].includes(csRegion?.toLowerCase());
const isDevelopmentRegion = !isStandardRegion && !!csRegion;

// Handle endpoints generation based on region type
if (isDevelopmentRegion) {
  // For development regions, generate endpoints based on the region value
  region = csRegion;
  
  const apiHost = `${csRegion}-api.csnonprod.com`;
  const appHost = `${csRegion}-app.csnonprod.com`;
  const previewHost = `${csRegion}-rest-preview.csnonprod.com`;
  
  // Create endpoints object with generated values
  endpoints = {
    api: apiHost,
    application: appHost,
    preview: previewHost
  };
  
} else {
  // For standard regions (EU/US), get an object with all endpoints for region.
  region = getRegionForString(csRegion); // Ensure region is typed as Region
  endpoints = getContentstackEndpoints(region, true);
}

export const stack = contentstack.stack({
  // Setting the API key from environment variables
  apiKey: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY as string,
  // Setting the delivery token from environment variables
  deliveryToken: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN as string,
  // Setting the environment based on environment variables
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT as string,
  // Setting the region based on environment variables
  region: region,
  // Host configuration for development regions
  ...(isDevelopmentRegion && endpoints.api ? { host: endpoints.api } : {}),
  live_preview: {    
    // Enabling live preview if specified in environment variables
    enable: process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true',
    // Setting the preview token from environment variables
    preview_token: process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN,
    // Setting the host for live preview based on the region
    host: endpoints.preview,
  }
});

// Initialize live preview functionality
export function initLivePreview() {
  ContentstackLivePreview.init({
    ssr: false, // Disabling server-side rendering for live preview
    enable: process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true', // Enabling live preview if specified in environment variables
    mode: "builder", // Setting the mode to "builder" for visual builder
    stackSdk: stack.config as IStackSdk, // Passing the stack configuration
    stackDetails: {
      apiKey: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY as string, // Setting the API key from environment variables
      environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT as string, // Setting the environment from environment variables
    },
    clientUrlParams: {
      host: endpoints.application
    },
    editButton: {
      enable: true, // Enabling the edit button for live preview
      exclude: ["outsideLivePreviewPortal"] // Excluding the edit button from the live preview portal
    },
  });
}
// Function to fetch page data based on the URL
export async function getPage(url: string) {
  const result = await stack
    .contentType("page") // Specifying the content type as "page"
    .entry() // Accessing the entry
    .query() // Creating a query
    .where("url", QueryOperation.EQUALS, url) // Filtering entries by URL
    .find<Page>(); // Executing the query and expecting a result of type Page

  if (result.entries) {
    const entry = result.entries[0]; // Getting the first entry from the result

    if (process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true') {
      contentstack.Utils.addEditableTags(entry, 'page', true); // Adding editable tags for live preview if enabled
    }

    return entry; // Returning the fetched entry
  }
}
