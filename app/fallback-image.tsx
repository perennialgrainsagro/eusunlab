"use client";

import { useState } from "react";
import { imageUrl } from "./lib/content-schema.ts";

type Props = {
  src: string;
  alt: string;
  className: string;
  placeholder?: string;
};

export function FallbackImage({ src, alt, className, placeholder }: Props) {
  const imageSrc = imageUrl(src);
  const [failedSrc, setFailedSrc] = useState("");

  return (
    <div className={className}>
      {imageSrc && failedSrc !== imageSrc ? (
        // Sheet-managed image hosts are not known ahead of deployment.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={alt} onError={() => setFailedSrc(imageSrc)} />
      ) : placeholder ? <span className="image-placeholder">{placeholder}</span> : null}
    </div>
  );
}
