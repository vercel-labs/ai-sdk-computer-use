"use server";

import { kernel, resolution } from ".";

export interface KernelBrowser {
  session_id: string;
  cdp_ws_url: string;
  browser_live_view_url: string;
}

// Cache for browser sessions
const browserCache = new Map<string, KernelBrowser>();

export const getBrowser = async (id?: string): Promise<KernelBrowser> => {
  try {
    // Check if we have a cached browser session
    if (id && browserCache.has(id)) {
      const cached = browserCache.get(id)!;
      // Verify the browser is still active
      try {
        const browser = await kernel.browsers.retrieve(id);
        if (browser) {
          return cached;
        }
      } catch {
        // Browser no longer exists, remove from cache
        browserCache.delete(id);
      }
    }

    // Create a new browser session with viewport matching our resolution
    // This ensures Claude's coordinates match the actual browser viewport
    const kernelBrowser = await kernel.browsers.create({
      headless: false,
      stealth: true,
      timeout_seconds: 300, // 5 minute timeout
      viewport: {
        width: resolution.x,
        height: resolution.y,
      },
    });

    const browser: KernelBrowser = {
      session_id: kernelBrowser.session_id,
      cdp_ws_url: kernelBrowser.cdp_ws_url,
      browser_live_view_url: kernelBrowser.browser_live_view_url ?? "",
    };

    browserCache.set(browser.session_id, browser);
    return browser;
  } catch (error) {
    console.error("Error in getBrowser:", error);
    throw error;
  }
};

export const getBrowserURL = async (
  id?: string,
): Promise<{ streamUrl: string; id: string }> => {
  try {
    const browser = await getBrowser(id);
    return {
      streamUrl: browser.browser_live_view_url,
      id: browser.session_id,
    };
  } catch (error) {
    console.error("Error in getBrowserURL:", error);
    throw error;
  }
};

export const killBrowser = async (id: string): Promise<void> => {
  try {
    await kernel.browsers.deleteByID(id);
    browserCache.delete(id);
  } catch (error) {
    console.error("Error in killBrowser:", error);
    // Don't throw - browser might already be deleted
  }
};
