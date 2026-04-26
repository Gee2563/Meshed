import type { AppProps } from "next/app";

// Next 15 still expects a Pages Router manifest in this mixed setup, so keep a minimal shim in place.
export default function MeshedPagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
