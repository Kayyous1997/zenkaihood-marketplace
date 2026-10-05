/// <reference types="vite/client" />

// Explicit declarations for image asset types used in the project
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.avif" {
  const src: string;
  export default src;
}
