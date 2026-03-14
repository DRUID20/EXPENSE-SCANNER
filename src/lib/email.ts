import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  firstName: string
) {
  const client = getResend();
  if (!client) {
    console.warn("RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  const FROM_EMAIL = process.env.EMAIL_FROM || "Gasco ExpenseTracker <noreply@gasco.ug>";
  const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Gasco Energy ExpenseTracker";

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#03D47C,#00C271);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:20px;margin:0;">${APP_NAME}</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#002E22;font-size:16px;margin:0 0 8px;">Hi ${firstName},</p>
      <p style="color:#76847E;font-size:14px;line-height:1.6;margin:0 0 24px;">
        We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#03D47C,#00C271);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">
          Reset Password
        </a>
      </div>

      <p style="color:#76847E;font-size:13px;line-height:1.6;margin:0 0 16px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color:#03D47C;font-size:12px;word-break:break-all;margin:0 0 24px;padding:12px;background:#f0fdf4;border-radius:8px;">
        ${resetUrl}
      </p>

      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />

      <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:0;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not change.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#fafafa;text-align:center;">
      <p style="color:#a1a1aa;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}
