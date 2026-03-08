import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";

const anthropic = new Anthropic();

const SCAN_PROMPT = `You are an expert receipt/invoice data extractor. Analyze the receipt image and extract all relevant expense information.

Return a JSON object with these fields:
{
  "vendor": "Store/vendor name",
  "title": "Brief description of the purchase",
  "amount": 0.00,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "category": "One of: Fuel & Gas, Equipment, Travel, Supplies, Meals, Transportation, Utilities, Maintenance, Office, Other",
  "tax": 0.00,
  "subtotal": 0.00,
  "lineItems": [
    { "description": "Item name", "quantity": 1, "unitPrice": 0.00, "total": 0.00 }
  ],
  "paymentMethod": "Cash/Credit Card/Debit Card/Other",
  "receiptNumber": "Receipt/invoice number if visible",
  "notes": "Any additional relevant info"
}

Rules:
- Extract ALL visible information from the receipt
- If a field is not visible, use null
- Amounts should be numbers, not strings
- Date should be in YYYY-MM-DD format
- Choose the most appropriate category from the list
- For the title, create a concise description like "Office supplies from Staples" or "Gas fill-up at Shell"
- Return ONLY valid JSON, no markdown or explanation`;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No receipt image provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: SCAN_PROMPT,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to extract data from receipt" }, { status: 500 });
    }

    let extractedData;
    try {
      const jsonText = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse extracted data", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      imageBase64: `data:${file.type};base64,${base64}`,
    });
  } catch (error) {
    console.error("Scan error:", error);
    const message = error instanceof Error ? error.message : "Failed to scan receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
