import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";

const anthropic = new Anthropic();

const SCAN_PROMPT = `You are an expert receipt/invoice data extractor. Analyze the receipt image and extract all relevant expense information using the extract_receipt_data tool.

Rules:
- Extract ALL visible information from the receipt
- All required fields (vendor, title, amount, currency, date, category) MUST be provided
- If vendor is unclear, use "Unknown Vendor"
- If date is unclear, use today's date
- If amount is unclear, use 0
- Amounts should be numbers, not strings
- Date should be in YYYY-MM-DD format
- Choose the most appropriate category from the list
- For the title, create a concise description like "Office supplies from Staples" or "Gas fill-up at Shell"
- Only include optional fields (tax, subtotal, lineItems, paymentMethod, receiptNumber, notes) if they are clearly visible`;

const extractReceiptTool: Anthropic.Tool = {
  name: "extract_receipt_data",
  description: "Extract structured expense data from a receipt or invoice image",
  input_schema: {
    type: "object" as const,
    properties: {
      vendor: {
        type: "string",
        description: "Store or vendor name",
      },
      title: {
        type: "string",
        description: "Brief description of the purchase",
      },
      amount: {
        type: "number",
        description: "Total amount paid",
      },
      currency: {
        type: "string",
        description: "Currency code (e.g. USD), defaults to USD",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      category: {
        type: "string",
        enum: [
          "Fuel & Gas",
          "Equipment",
          "Travel",
          "Supplies",
          "Meals",
          "Transportation",
          "Utilities",
          "Maintenance",
          "Office",
          "Other",
        ],
        description: "Expense category",
      },
      tax: {
        type: "number",
        description: "Tax amount if visible",
      },
      subtotal: {
        type: "number",
        description: "Subtotal before tax if visible",
      },
      lineItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            total: { type: "number" },
          },
          required: ["description", "quantity", "unitPrice", "total"],
        },
        description: "Individual line items on the receipt",
      },
      paymentMethod: {
        type: "string",
        description: "Payment method (Cash, Credit Card, Debit Card, Other)",
      },
      receiptNumber: {
        type: "string",
        description: "Receipt or invoice number if visible",
      },
      notes: {
        type: "string",
        description: "Any additional relevant information",
      },
    },
    required: ["vendor", "title", "amount", "currency", "date", "category"],
  },
};

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
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [extractReceiptTool],
      tool_choice: { type: "tool", name: "extract_receipt_data" },
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

    const toolUseBlock = response.content.find((block) => block.type === "tool_use");
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return NextResponse.json({ error: "Failed to extract data from receipt" }, { status: 500 });
    }

    const extractedData = toolUseBlock.input;

    return NextResponse.json({
      success: true,
      data: extractedData,
      imageBase64: `data:${file.type};base64,${base64}`,
    });
  } catch (error) {
    console.error("Scan error:", error);
    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json({ error: "AI service not configured. Please set ANTHROPIC_API_KEY." }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Failed to scan receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
