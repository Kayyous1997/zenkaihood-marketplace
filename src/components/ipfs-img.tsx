import { useEffect, useState, type ImgHTMLAttributes } from "react";

import { resolveImageUri } from "@/lib/metadata";
import { ipfsPath } from "@/lib/ipfs";

type IpfsImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  uri: string;
};

const CLIENT_GATEWAY_FALLBACKS = [
  "https://ipfs.filebase.io/ipfs/",
  "https://w3s.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

/** Loads IPFS/HTTP images through same-origin proxy with automatic client-side gateway fallback. */
export function IpfsImg({ uri, onError, ...props }: IpfsImgProps) {
  const [gatewayIdx, setGatewayIdx] = useState(0);
  const path = ipfsPath(uri);

  useEffect(() => {
    setGatewayIdx(0);
  }, [uri]);

  // If IPFS path, start with same-origin /api/ipfs/ proxy, then step through client gateway fallbacks
  let src: string;
  if (path) {
    if (gatewayIdx === 0) {
      src = resolveImageUri(uri) ?? uri;
    } else {
      const fallbackGw = CLIENT_GATEWAY_FALLBACKS[gatewayIdx - 1] ?? CLIENT_GATEWAY_FALLBACKS[0];
      src = `${fallbackGw}${path}`;
    }
  } else {
    src = resolveImageUri(uri) ?? uri;
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (path && gatewayIdx < CLIENT_GATEWAY_FALLBACKS.length) {
      setGatewayIdx((prev) => prev + 1);
    } else {
      onError?.(e);
    }
  };

  return <img {...props} src={src} onError={handleError} referrerPolicy="no-referrer" />;
}
