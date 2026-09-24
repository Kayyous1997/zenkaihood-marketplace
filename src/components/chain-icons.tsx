import type { SVGProps } from "react";

/**
 * Base Chain Official Icon (Blue circle with white stylized cutout)
 */
export function BaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        d="M16 6.5C10.7533 6.5 6.5 10.7533 6.5 16C6.5 21.2467 10.7533 25.5 16 25.5C21.0567 25.5 25.1867 21.56 25.4867 16.58H16.88V15.42H25.4867C25.1867 10.44 21.0567 6.5 16 6.5Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Robinhood Chain Official Icon (Signature neon green feather)
 */
export function RobinhoodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#000000" />
      <path
        d="M19.2 6.2c-.3 2.1-1.3 4-2.6 5.6-1.5 1.8-3.3 3.3-4.8 5.1-1.3 1.5-2.2 3.3-2.3 5.3-.1 1.9.7 3.8 2.3 4.8 1.5 1 3.4.9 5-.1 1.4-.9 2.4-2.3 3.4-3.6 1.4-1.8 2.8-3.7 4.1-5.7.8-1.3 1.5-2.7 2-4.1.3-.9.5-1.9.5-2.8 0-1-.3-2-.7-2.9-.6-1.1-1.5-2-2.5-2.7-.9-.6-1.9-1-2.9-1.2-.5-.1-1.1-.1-1.5.3z"
        fill="#00C805"
      />
      <path
        d="M14.5 14.2c.4-.6.8-1.2 1.3-1.8.6-.7 1.3-1.3 2-1.9.4-.3.8-.6 1.2-.8-.8 1.4-1.9 2.6-3.1 3.6-.5.4-1 .8-1.4 1.1.1-.1 0-.1 0-.2z"
        fill="#00FF87"
      />
    </svg>
  );
}

export const BASE_ICON_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Ccircle cx='16' cy='16' r='16' fill='%230052FF'/%3E%3Cpath d='M16 6.5C10.7533 6.5 6.5 10.7533 6.5 16C6.5 21.2467 10.7533 25.5 16 25.5C21.0567 25.5 25.1867 21.56 25.4867 16.58H16.88V15.42H25.4867C25.1867 10.44 21.0567 6.5 16 6.5Z' fill='white'/%3E%3C/svg%3E";

export const ROBINHOOD_ICON_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23000000'/%3E%3Cpath d='M19.2 6.2c-.3 2.1-1.3 4-2.6 5.6-1.5 1.8-3.3 3.3-4.8 5.1-1.3 1.5-2.2 3.3-2.3 5.3-.1 1.9.7 3.8 2.3 4.8 1.5 1 3.4.9 5-.1 1.4-.9 2.4-2.3 3.4-3.6 1.4-1.8 2.8-3.7 4.1-5.7.8-1.3 1.5-2.7 2-4.1.3-.9.5-1.9.5-2.8 0-1-.3-2-.7-2.9-.6-1.1-1.5-2-2.5-2.7-.9-.6-1.9-1-2.9-1.2-.5-.1-1.1-.1-1.5.3z' fill='%2300C805'/%3E%3Cpath d='M14.5 14.2c.4-.6.8-1.2 1.3-1.8.6-.7 1.3-1.3 2-1.9.4-.3.8-.6 1.2-.8-.8 1.4-1.9 2.6-3.1 3.6-.5.4-1 .8-1.4 1.1.1-.1 0-.1 0-.2z' fill='%2300FF87'/%3E%3C/svg%3E";
