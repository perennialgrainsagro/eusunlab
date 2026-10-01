"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className: string;
};

export function FallbackImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={className}>
      {src && !failed ? (
        // Sheet-managed image hosts are not known ahead of deployment.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setFailed(true)} />
      ) : null}
    </div>
  );
}
