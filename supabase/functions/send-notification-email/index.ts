import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  notificationId: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notificationId, userId }: NotificationEmailRequest = await req.json();

    console.log("Processing notification email:", { notificationId, userId });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get notification details
    const { data: notification, error: notifError } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    if (notifError || !notification) {
      throw new Error(`Notification not found: ${notifError?.message}`);
    }

    // Get user's notification settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings || !settings.email_enabled) {
      console.log("Email notifications disabled for user");
      return new Response(
        JSON.stringify({ message: "Email notifications disabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if this notification type should trigger an email
    const shouldSend = 
      (notification.type === "low_stock" && settings.notify_on_low_stock) ||
      (notification.type === "critical_stock" && settings.notify_on_critical_stock) ||
      (notification.type === "order_received" && settings.notify_on_order_received) ||
      (notification.type === "order_sent" && settings.notify_on_order_sent) ||
      (notification.type === "inventory_completed" && settings.notify_on_inventory_completed);

    if (!shouldSend) {
      console.log("Notification type not enabled for email");
      return new Response(
        JSON.stringify({ message: "Notification type not enabled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user's email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      throw new Error(`User not found: ${userError?.message}`);
    }

    const userEmail = settings.notification_email || userData.user.email;

    if (!userEmail) {
      throw new Error("No email address found for user");
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Stock Management <onboarding@resend.dev>",
      to: [userEmail],
      subject: `[${notification.severity.toUpperCase()}] ${notification.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${notification.severity === 'critical' ? '#dc2626' : notification.severity === 'warning' ? '#ea580c' : '#0284c7'};">
            ${notification.title}
          </h2>
          <p style="font-size: 16px; line-height: 1.5;">
            ${notification.message}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 14px; color: #6b7280;">
            Type: ${notification.type.replace('_', ' ')}<br>
            Date: ${new Date(notification.created_at).toLocaleString('fr-FR')}
          </p>
          ${notification.related_table && notification.related_id ? `
            <p style="font-size: 14px; color: #6b7280;">
              Référence: ${notification.related_table}/${notification.related_id}
            </p>
          ` : ''}
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
            Ceci est une notification automatique de votre système de gestion de stock.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
