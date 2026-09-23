// Ships the font licence texts from LICENSES/ as /licenses/<name>.txt. SIL OFL 1.1 asks that
// the licence travel with the font software, and the site serves the fonts itself.
// LICENSES/ stays the single copy; this route only publishes it.
import type { APIRoute, GetStaticPaths } from 'astro';

const texts = import.meta.glob<string>('../../../LICENSES/*.txt', { query: '?raw', import: 'default', eager: true });

export const getStaticPaths = (() =>
  Object.entries(texts).map(([path, text]) => ({
    params: { file: path.slice(path.lastIndexOf('/') + 1, -'.txt'.length) },
    props: { text },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
