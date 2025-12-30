// lib/utils/orderIdGenerator.ts
import { connectToDatabase } from "@/lib/database";
import OrderCounter from "@/lib/database/models/OrderCounter";

/**
 * Generates a branch prefix from branch name
 * Examples: "ranna" -> "RA", "main branch" -> "MB", "colombo" -> "CO"
 */
function generateBranchPrefix(branchName: string): string {
  if (!branchName || branchName.trim().length === 0) {
    return "GN"; // General/Generic prefix
  }

  const cleaned = branchName.trim().toUpperCase();
  
  // Handle multi-word branch names
  const words = cleaned.split(/\s+/);
  
  if (words.length >= 2) {
    // Take first letter of each word (max 3 letters)
    return words
      .slice(0, 3)
      .map(word => word.charAt(0))
      .join('');
  } else {
    // Single word - take first 2-3 letters
    const singleWord = words[0];
    if (singleWord.length >= 3) {
      return singleWord.substring(0, 3);
    } else if (singleWord.length === 2) {
      return singleWord;
    } else {
      return singleWord + "0"; // Pad single letter with 0
    }
  }
}

/**
 * Formats order number with leading zeros
 */
function formatOrderNumber(num: number, length: number = 4): string {
  return num.toString().padStart(length, '0');
}

/**
 * Ensures database connection before operations
 */
async function ensureDbConnection() {
  try {
    await connectToDatabase();
    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

/**
 * Generates the next order ID for a given branch
 * This function is atomic and thread-safe
 */
export async function generateNextOrderId(branchName: string): Promise<string> {
  console.log(`🔄 [generateNextOrderId] Starting for branch: ${branchName}`);
  
  try {
    // Ensure database connection first
    console.log(`📡 [generateNextOrderId] Ensuring database connection...`);
    await ensureDbConnection();
    console.log(`✅ [generateNextOrderId] Database connection verified`);
    
    const branchPrefix = generateBranchPrefix(branchName);
    console.log(`🏷️ [generateNextOrderId] Generated prefix: ${branchPrefix}`);
    
    // Add retry logic for MongoDB operations
    let retries = 3;
    let result = null;
    let lastError = null;
    
    while (retries > 0) {
      try {
        console.log(`🔄 [generateNextOrderId] Attempting counter operation (${4 - retries}/3)...`);
        
        // Use atomic upsert operation to avoid race conditions
        result = await OrderCounter.findOneAndUpdate(
          { branchName: branchName.trim().toLowerCase() },
          {
            $inc: { lastOrderNumber: 1 },
            $set: { 
              branchPrefix: branchPrefix,
              lastOrderId: undefined 
            }
          },
          {
            new: true,
            upsert: true,
            runValidators: true
          }
        );
        
        console.log(`✅ [generateNextOrderId] Counter operation successful on attempt ${4 - retries}`);
        console.log(`📊 [generateNextOrderId] Result: ${JSON.stringify({
          branchName: result?.branchName,
          branchPrefix: result?.branchPrefix,
          lastOrderNumber: result?.lastOrderNumber
        })}`);
        
        break; // Success, exit retry loop
      } catch (retryError: any) {
        lastError = retryError;
        retries--;
        console.error(`❌ [generateNextOrderId] Attempt ${4 - retries} failed: ${retryError.message}`);
        
        if (retries === 0) {
          console.error(`❌ [generateNextOrderId] All retries exhausted. Last error: ${retryError.message}`);
          throw retryError;
        }
        
        // Wait a bit before retry and re-establish connection on last retry
        const waitTime = (4 - retries) * 200; // Progressive wait: 200ms, 400ms, 600ms
        console.log(`⏳ [generateNextOrderId] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        if (retries === 1) {
          // Last retry - try to re-establish connection
          console.log(`🔄 [generateNextOrderId] Last retry - re-establishing connection...`);
          await ensureDbConnection();
        }
      }
    }

    if (!result) {
      const errorMsg = `Failed to generate order counter after 3 retries. Last error: ${lastError?.message}`;
      console.error(`❌ [generateNextOrderId] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Generate the complete order ID
    const formattedNumber = formatOrderNumber(result.lastOrderNumber);
    const orderId = `${result.branchPrefix}${formattedNumber}`;
    console.log(`🆔 [generateNextOrderId] Generated order ID: ${orderId}`);

    // Update the record with the complete order ID for reference (with retry)
    try {
      console.log(`📝 [generateNextOrderId] Updating counter with full order ID...`);
      await OrderCounter.findByIdAndUpdate(result._id, {
        lastOrderId: orderId
      });
      console.log(`✅ [generateNextOrderId] Counter updated with full order ID`);
    } catch (updateError: any) {
      console.warn(`⚠️ [generateNextOrderId] Failed to update lastOrderId, but order ID generated: ${orderId}`);
      console.warn(`⚠️ [generateNextOrderId] Update error: ${updateError.message}`);
    }

    console.log(`✅ [generateNextOrderId] Successfully generated order ID: ${orderId}`);
    return orderId;
    
  } catch (error: any) {
    console.error(`❌ [generateNextOrderId] Critical error: ${error.message}`);
    console.error(`❌ [generateNextOrderId] Error stack: ${error.stack}`);
    
    // Fallback to timestamp-based ID if counter fails
    const fallbackPrefix = generateBranchPrefix(branchName);
    const timestamp = Date.now().toString().slice(-6);
    const fallbackId = `${fallbackPrefix}${timestamp}`;
    
    console.warn(`🔄 [generateNextOrderId] Using fallback order ID: ${fallbackId}`);
    console.warn(`🔄 [generateNextOrderId] Fallback reason: Counter operation failed - ${error.message}`);
    
    return fallbackId;
  }
}

/**
 * Gets the current counter status for a branch
 */
export async function getBranchOrderStatus(branchName: string) {
  try {
    console.log(`📊 Getting order status for branch: ${branchName}`);
    
    // Ensure database connection first
    await ensureDbConnection();
    
    let counter = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        counter = await OrderCounter.findOne({
          branchName: branchName.trim().toLowerCase()
        });
        break; // Success, exit retry loop
      } catch (retryError: any) {
        retries--;
        console.warn(`⚠️ Order status query failed, retries left: ${retries}`, retryError.message);
        if (retries === 0) throw retryError;
        // Wait a bit before retry and re-establish connection
        await new Promise(resolve => setTimeout(resolve, 200));
        if (retries === 1) {
          // Last retry - try to re-establish connection
          await ensureDbConnection();
        }
      }
    }

    const prefix = generateBranchPrefix(branchName);
    const lastOrderNumber = counter?.lastOrderNumber || 0;
    const nextOrderNumber = lastOrderNumber + 1;
    const nextOrderId = `${counter?.branchPrefix || prefix}${formatOrderNumber(nextOrderNumber)}`;

    console.log(`📈 Branch status - Last: ${lastOrderNumber}, Next: ${nextOrderId}`);

    return {
      branchName: branchName,
      branchPrefix: counter?.branchPrefix || prefix,
      lastOrderNumber: lastOrderNumber,
      lastOrderId: counter?.lastOrderId || null,
      nextOrderNumber: nextOrderNumber,
      nextOrderId: nextOrderId
    };
  } catch (error: any) {
    console.error("❌ Error getting branch order status:", error);
    const prefix = generateBranchPrefix(branchName);
    return {
      branchName: branchName,
      branchPrefix: prefix,
      lastOrderNumber: 0,
      lastOrderId: null,
      nextOrderNumber: 1,
      nextOrderId: `${prefix}0001`
    };
  }
}

/**
 * Validates an order ID format
 */
export function validateOrderId(orderId: string): boolean {
  // Should be 2-3 letters followed by 4 digits
  const pattern = /^[A-Z]{2,3}\d{4}$/;
  return pattern.test(orderId);
}

// Export utility functions for testing
export { generateBranchPrefix, formatOrderNumber };