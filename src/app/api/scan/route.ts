import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const anthropic = new Anthropic();

const SCAN_PROMPT = `You are an expert receipt/invoice data extractor. Analyze the receipt image carefully and extract all relevant expense information using the extract_receipt_data tool.

Rules:
- Read EVERY line of text on the receipt carefully before extracting
- Extract ALL visible information — do not guess or approximate
- If a field is not clearly visible, use null rather than guessing
- Amounts MUST be exact numbers as printed on the receipt, not estimates
- Pay close attention to decimal points and comma separators (e.g. 1,500 vs 15.00)
- The TOTAL amount is usually the largest bold number at the bottom — look for "Total", "Grand Total", "Amount Due"
- Date should be in YYYY-MM-DD format
- Currency: look for currency symbols (UGX, USh, $, €, £, KES, TZS) — default to UGX if unclear
- Choose the most appropriate category from the list
- For the title, create a concise description like "Office supplies from Staples" or "Gas fill-up at Shell"
- Extract ALL line items with their exact quantities, unit prices, and totals`;

const extractReceiptTool: Anthropic.Tool = {
  name: "extract_receipt_data",
  description: "Extract structured expense data from a receipt or invoice image",
  input_schema: {
    type: "object" as const,
    properties: {
      vendor: {
        type: ["string", "null"],
        description: "Store or vendor name",
      },
      title: {
        type: ["string", "null"],
        description: "Brief description of the purchase",
      },
      amount: {
        type: ["number", "null"],
        description: "Total amount paid",
      },
      currency: {
        type: ["string", "null"],
        description: "Currency code (e.g. UGX)",
      },
      date: {
        type: ["string", "null"],
        description: "Date in YYYY-MM-DD format",
      },
      category: {
        type: ["string", "null"],
        enum: [
          "Fuel & Gas",
          "Equipment",
          "Office Supplies",
          "Meals",
          "Transport & Accommodation",
          "Utilities",
          "Repair & Maintenance",
          "Vehicle Repairs & Maintenance",
          "Generator Expenses",
          "Other",
          null,
        ],
        description: "Expense category",
      },
      tax: {
        type: ["number", "null"],
        description: "Tax amount",
      },
      subtotal: {
        type: ["number", "null"],
        description: "Subtotal before tax",
      },
      lineItems: {
        type: ["array", "null"],
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
        type: ["string", "null"],
        description: "Payment method (Cash, Credit Card, Debit Card, Other)",
      },
      receiptNumber: {
        type: ["string", "null"],
        description: "Receipt or invoice number if visible",
      },
      notes: {
        type: ["string", "null"],
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

    // Rate limit: 20 scans per 15 minutes per user
    const limit = rateLimit(`scan:${session.userId}`, 20, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many scan requests. Try again in ${limit.resetInSeconds} seconds.` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No receipt image provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, GIF, or PDF file." },
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
    const isPdf = file.type === "application/pdf";

    // Build message content based on file type
    const contentBlocks: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (isPdf) {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      } as unknown as Anthropic.ContentBlockParam);
    } else {
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64,
        },
      });
    }

    contentBlocks.push({
      type: "text",
      text: SCAN_PROMPT,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [extractReceiptTool],
      tool_choice: { type: "tool", name: "extract_receipt_data" },
      messages: [
        {
          role: "user",
          content: contentBlocks,
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
      imageBase64: isPdf ? null : `data:${file.type};base64,${base64}`,
      isPdf,
    });
  } catch (error) {
    console.error("Scan error:", error);
    const message = error instanceof Error ? error.message : "Failed to scan receipt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
