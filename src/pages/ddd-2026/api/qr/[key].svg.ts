// One QR code per URL in src/data/ddd2026.json's links, drawn at deploy time into
// /ddd-2026/api/qr/<key>.svg. Only those URLs, so it isn't an open QR generator.
import type { APIRoute, GetStaticPaths } from 'astro';
import QRCode from 'qrcode';
import kiosk from '../../../../data/ddd2026.json';

export const prerender = true;

export const getStaticPaths = (() =>
  Object.entries(kiosk.links)
    .filter(([, url]) => url.startsWith('http'))
    .map(([key, url]) => ({ params: { key }, props: { url } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const svg = await QRCode.toString(props.url, { type: 'svg', margin: 1, color: { dark: '#050a17', light: '#ffffff' } });
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } });
};
