// Importing Contentstack SDK and specific types for region and query operations
import contentstack, { QueryOperation } from "@contentstack/delivery-sdk";
// Importing Contentstack Live Preview utilities and stack SDK 
import ContentstackLivePreview, { IStackSdk } from "@contentstack/live-preview-utils";
// Importing the Page type definition 
import { Page } from "./types";
// helper functions from private package to retrieve Contentstack endpoints in a convienient way
import { getContentstackEndpoints, getRegionForString } from "@timbenniks/contentstack-endpoints";

// Get region or handle custom development regions
const region = getRegionForString(process.env.NEXT_PUBLIC_CONTENTSTACK_REGION as string) || (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION as string) || 'us';
const isPreviewEnabled = process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW === 'true';

let endpoints:any;
let isDevelopmentRegion = !!(process.env.NEXT_PUBLIC_CONTENTSTACK_API_HOST && process.env.NEXT_PUBLIC_CONTENTSTACK_APP_HOST);


function removeHttpPrefix(url: string) {
  // Remove "http://" or "https://" prefix from the URL
  return url.replace(/^(http:\/\/|https:\/\/)/, '');
}

function determineContentstackEndpoints() {
  // Handle endpoints generation 
  if (isDevelopmentRegion) {
    const apiHost = removeHttpPrefix(process.env.NEXT_PUBLIC_CONTENTSTACK_API_HOST as string);
    const appHost = removeHttpPrefix(process.env.NEXT_PUBLIC_CONTENTSTACK_APP_HOST as string);
    const previewHost = appHost.replace('app', 'rest-preview');
    // Create endpoints object with generated values
    return {
      api: apiHost,
      application: appHost,
      preview: previewHost
    };
  } else {
    // For standard regions (EU/US), get an object with all endpoints for region.
    return getContentstackEndpoints(region, true);
  }
}

endpoints = determineContentstackEndpoints(); // Get the endpoints 


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
    enable: isPreviewEnabled,
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
    enable: isPreviewEnabled, // Enabling live preview if specified in environment variables
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

    if (isPreviewEnabled) {
      contentstack.Utils.addEditableTags(entry, 'page', true); // Adding editable tags for live preview if enabled
    }

    return entry; // Returning the fetched entry
  }
}
