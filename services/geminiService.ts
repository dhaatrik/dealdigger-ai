
import { GoogleGenAI, GenerateContentResponse, GroundingMetadata, Content } from "@google/genai";
import { Deal, UserPreferences, DealVerification, PriceDataPoint } from '../types';
import { GEMINI_MODEL_TEXT, INITIAL_DEALS_COUNT } from '../constants';

let ai: GoogleGenAI | null = null;

const initializeAi = (): GoogleGenAI => {
  if (ai) return ai;
  // Access Vite environment variables using import.meta.env
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY environment variable not found. AI features will be disabled.");
    throw new Error("API_KEY_MISSING");
  }
  ai = new GoogleGenAI({ apiKey: apiKey });
  return ai;
};

const parseJsonFromText = <T,>(text: string, isArrayExpected: boolean = false): T | null => {
  /*
   * Security Note on JSON Parsing:
   * This function uses `JSON.parse()` to convert a text string from the AI into a JavaScript object.
   *
   * 1. Safety of JSON.parse():
   *    `JSON.parse()` itself is inherently secure against executing JavaScript embedded within the
   *    JSON string. It strictly adheres to the JSON grammar. If the string is not valid JSON,
   *    it will throw a SyntaxError. It does not evaluate or execute any code.
   *
   * 2. Content Sanitization:
   *    While `JSON.parse()` is safe, the *content* of the parsed JSON (e.g., string values) could
   *    theoretically contain malicious scripts if the AI were to generate them. The responsibility
   *    for sanitizing this content against Cross-Site Scripting (XSS) vulnerabilities lies
   *    downstream, typically at the point where this data is rendered into the HTML.
   *
   * 3. React's Role:
   *    In this application, React's JSX rendering mechanism provides significant protection.
   *    When string data (like `deal.title` or `verification.summary`) is rendered directly
   *    within JSX elements (e.g., `<h3>{deal.title}</h3>`), React automatically escapes
   *    the content. This means characters like `<`, `>`, `&` are converted to HTML entities
   *    (e.g., `&lt;`, `&gt;`, `&amp;`), preventing them from being interpreted as HTML or script.
   *
   * 4. When Explicit Sanitization is Needed:
   *    Explicit sanitization would be crucial if:
   *    a) AI-generated content were to be used with `dangerouslySetInnerHTML`.
   *    b) AI-generated content were to be injected into `<script>` tags, HTML event handlers
   *       (e.g., `onclick="<ai_content>" `), or CSS `url()` values, without proper escaping
   *       or validation suited for those specific contexts.
   *    This application avoids such practices for AI-generated text.
   *
   * 5. Function Scope:
   *    This `parseJsonFromText` function's scope is limited to the structural parsing of the
   *    JSON text into a JavaScript object or array. It does not, and should not, handle
   *    HTML sanitization of the individual string values within the parsed structure.
   */
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const fenceMatch = jsonStr.match(fenceRegex);
  if (fenceMatch && fenceMatch[2]) {
    jsonStr = fenceMatch[2].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response (1st attempt):", (e as Error).message, "Original text snippet:", jsonStr.substring(0, 300));

    // Fallback 1: Iterative parsing for arrays (if an array is expected)
    if (isArrayExpected && jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
      const arrayContent = jsonStr.substring(1, jsonStr.length - 1).trim();
      const extractedObjects: Record<string, unknown>[] = [];

      // Regex to match strings (ignoring escaped quotes) OR braces
      // This is more robust and faster than character-by-character iteration
      const tokenRegex = /"(?:[^"\\]|\\.)*"|[{}]/g;

      let match;
      let depth = 0;
      let startIndex = -1;

      while ((match = tokenRegex.exec(arrayContent)) !== null) {
        const token = match[0];

        if (token === '{') {
            if (depth === 0) {
                startIndex = match.index;
            }
            depth++;
        } else if (token === '}') {
            depth--;
            if (depth === 0 && startIndex !== -1) {
                // Found a potential object from startIndex to match.index + 1
                const potentialObjStr = arrayContent.substring(startIndex, match.index + 1);
                try {
                    const obj = JSON.parse(potentialObjStr);
                    extractedObjects.push(obj);
                } catch {
                    // Ignore malformed object
                }
                startIndex = -1; // Reset
            }
        }
      }
      
      if (extractedObjects.length > 0) {
        console.log(`Successfully extracted ${extractedObjects.length} objects from malformed array string via iterative parsing.`);
        return extractedObjects as T;
      } else {
        // console.error("Failed to extract any valid objects from the presumed array string using iterative parsing.");
      }
    }
    
    // Fallback 2: Try the original loose regex match for any JSON structure (object or array)
    // This is useful if it's not an array or if iterative array parsing failed.
    const jsonLooseMatch = jsonStr.match(/(\[[\s\S]*\]|\{[\s\S]*\})/s); // Match array or object
    if (jsonLooseMatch && jsonLooseMatch[0]) {
      try {
        const parsed = JSON.parse(jsonLooseMatch[0]) as T;
        console.log("Successfully parsed with general loose JSON match.");
        return parsed;
      } catch (e2) {
        console.error("Failed to parse loosely matched JSON (2nd attempt):", (e2 as Error).message);
      }
    }
    
    return null;
  }
};

export const generateDeals = async (preferences: UserPreferences, useSearchGrounding: boolean = false): Promise<{deals: Deal[], groundingMetadata?: GroundingMetadata}> => {
  try {
    const localAi = initializeAi();
    let prompt = `Generate ${INITIAL_DEALS_COUNT} realistic-sounding deals for an e-commerce website.
For each deal, include: title, a short description (1-2 sentences), original price (e.g., $100.00), discounted price (e.g., $75.00), merchant name (e.g., Amazon, BestBuy, LocalMart), and a product category.
Output ONLY the deals as a JSON array of objects, where each object has keys: "title", "description", "originalPrice", "discountedPrice", "merchant", "category".
Ensure prices are strings representing currency values. Do not include any text before or after the JSON array.
Example of one deal object:
{
  "title": "50% Off Sony WH-1000XM5 Noise Cancelling Headphones",
  "description": "Experience industry-leading noise cancellation with these premium headphones. Perfect for travel and focus.",
  "originalPrice": "399.99",
  "discountedPrice": "199.99",
  "merchant": "BestBuy",
  "category": "Electronics"
}`;

    if (preferences.keywords) {
      prompt += `\nFocus on deals related to: "${preferences.keywords}".`;
    }
    if (preferences.categories.length > 0) {
      prompt += `\nPrioritize categories: ${preferences.categories.join(', ')}. Available categories can include Electronics, Fashion, Home & Kitchen, Sports & Outdoors, Books, Groceries, Beauty & Personal Care, Toys & Games, Automotive, Travel.`;
    }
    if (preferences.location) {
      prompt += `\nConsider offers relevant to location: "${preferences.location}" or online deals accessible from there. Mention if a deal is local or online.`;
    }
    prompt += `\nProvide varied and appealing deals. If generating local deals, ensure the merchant name reflects that. Ensure the output is strictly a JSON array.`;


    const config: Record<string, unknown> = { responseMimeType: "application/json" }; 
    let finalPrompt = prompt;
    
    if (useSearchGrounding) {
        let searchQuery = "latest deals";
        if (preferences.keywords) searchQuery += ` for ${preferences.keywords}`;
        if (preferences.categories.length > 0) searchQuery += ` in ${preferences.categories.join(', ')}`;
        if (preferences.location) searchQuery += ` near ${preferences.location}`;
        
        const searchPrompt = `Find recent top deals based on the query: "${searchQuery}".
        Provide a list of up to ${INITIAL_DEALS_COUNT} deals.
        For each deal, extract or infer: title, a short description, original price, discounted price, merchant name, and a product category.
        Format the output ONLY as a JSON array of objects with keys: "title", "description", "originalPrice", "discountedPrice", "merchant", "category".
        Do not include any text before or after the JSON array.
        If price information is not available, you can state "Price varies" or omit price fields for that specific deal.
        Focus on concrete deals, not general advice.`;
        
        finalPrompt = searchPrompt;
        config.tools = [{googleSearch: {}}];
        delete config.responseMimeType; 
    }

    const contents: Content[] = [{ role: 'user', parts: [{ text: finalPrompt }] }];


    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: contents,
      config: config,
    });

    const responseText = response?.text ?? "";
    const parsedDeals = parseJsonFromText<Deal[]>(responseText, true); // Indicate that an array is expected
    
    const dealsWithIds: Deal[] = (parsedDeals || []).map((deal, index) => ({
      ...deal,
      id: `${Date.now()}-${index}`, 
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(deal.title || `deal-${index}`)}/300/200`
    }));

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;
    
    if (groundingMetadata && groundingMetadata.groundingChunks && dealsWithIds.length === 0 && responseText.length > 5) { // If parsing failed but we got some text
        console.warn("Failed to parse deals from AI response, but received text. Response text:", responseText.substring(0, 500));
    }

    return { deals: dealsWithIds, groundingMetadata };

  } catch (error) {
    console.error("Error generating deals:", error);
    if ((error as Error).message === "API_KEY_MISSING") throw error;
    throw new Error("Failed to generate deals from AI.");
  }
};


export const verifyDeal = async (deal: Deal): Promise<DealVerification> => {
  try {
    const localAi = initializeAi();
    const prompt = `Given the following deal information:
Title: ${deal.title}
Description: ${deal.description}
Original Price: ${deal.originalPrice}
Discounted Price: ${deal.discountedPrice}
Merchant: ${deal.merchant}
Category: ${deal.category}

Assess the authenticity and value of this deal. Provide a brief verification summary (1-2 sentences) and a score from 1 (likely scam/bad deal) to 5 (excellent, trustworthy deal).
Consider factors like typical product pricing for the category, merchant reputation (if generally known), and plausibility of the discount.
Output ONLY the result as a JSON object with keys: "summary" (string) and "score" (number). Do not include any text before or after the JSON object.
Example output:
{
  "summary": "This seems like a legitimate and good value deal from a reputable merchant, given the typical price range for this product type.",
  "score": 4
}`;

    const response: GenerateContentResponse = await localAi.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const responseText = response?.text ?? "";
    const verificationResult = parseJsonFromText<DealVerification>(responseText, false); // Not an array
    if (!verificationResult) {
      console.warn("Failed to parse deal verification from AI response. Response text:", responseText.substring(0, 500));
      return { summary: "AI could not verify this deal due to response format error.", score: 0 };
    }
    return verificationResult;

  } catch (error) {
    console.error("Error verifying deal:", error);
    if ((error as Error).message === "API_KEY_MISSING") throw error;
    return { summary: "Failed to connect to AI for verification.", score: 0 };
  }
};


export const generateMockPriceHistory = (basePriceStr: string): PriceDataPoint[] => {
  const basePrice = parseFloat(basePriceStr?.replace('$', ''));
  if (isNaN(basePrice)) return [];
  const history: PriceDataPoint[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i * 7); 
    const priceFluctuation = (Math.random() - 0.3) * (basePrice * 0.2); 
    let price = basePrice + priceFluctuation;
    if (i === 0) price = basePrice; 
    history.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(price.toFixed(2)),
    });
  }
  return history;
};
