import { Head, Html, Main, NextScript } from "next/document";

// Minimal document shim to keep Next's legacy manifest generation happy alongside the App Router.
export default function MeshedDocument() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
