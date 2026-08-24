"use client";

import { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface WhatsAppLeadButtonProps {
  href: string;
  service: string;
  placement?: string;
  className?: string;
  children: ReactNode;
}

export default function WhatsAppLeadButton({
  href,
  service,
  placement = "cta_section",
  className = "",
  children,
}: WhatsAppLeadButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        trackEvent("click_whatsapp", {
          service,
          placement,
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}
