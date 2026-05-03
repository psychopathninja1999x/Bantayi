import { documentDirectory, downloadAsync } from 'expo-file-system/legacy';

export interface OnlineLogoResult {
  id: string;
  title: string;
  thumbnailUrl: string;
  sourceUrl: string;
}

interface WikiPage {
  pageid?: number;
  title?: string;
  fullurl?: string;
  thumbnail?: { source?: string };
}

interface WikiResponse {
  query?: {
    pages?: Record<string, WikiPage>;
  };
}

function cleanTitle(title: string): string {
  return title.replace(/^File:/i, '').replace(/\.(png|jpe?g|webp|svg)$/i, '').replace(/_/g, ' ');
}

function extFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'png';
  if (lower.includes('.webp')) return 'webp';
  return 'jpg';
}

function pagesToResults(response: WikiResponse): OnlineLogoResult[] {
  const pages = Object.values(response.query?.pages ?? {});
  return pages
    .filter((page) => page.pageid && page.title && page.thumbnail?.source)
    .map((page) => ({
      id: String(page.pageid),
      title: cleanTitle(page.title ?? 'Logo'),
      thumbnailUrl: page.thumbnail?.source ?? '',
      sourceUrl: page.fullurl ?? page.thumbnail?.source ?? '',
    }));
}

async function searchWikiApi(
  endpoint: string,
  query: string,
  options: { fileNamespace?: boolean } = {},
): Promise<OnlineLogoResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '8',
    prop: 'pageimages|info',
    piprop: 'thumbnail',
    pithumbsize: '320',
    inprop: 'url',
  });
  if (options.fileNamespace) {
    params.set('gsrnamespace', '6');
  }
  const response = await fetch(`${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Online logo search failed.');
  }
  return pagesToResults((await response.json()) as WikiResponse);
}

export async function searchOnlineLogos(query: string): Promise<OnlineLogoResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const searchTerm = `${trimmed} logo`;
  const [wiki, commons] = await Promise.allSettled([
    searchWikiApi('https://en.wikipedia.org/w/api.php', searchTerm),
    searchWikiApi('https://commons.wikimedia.org/w/api.php', searchTerm, { fileNamespace: true }),
  ]);

  const results = [
    ...(wiki.status === 'fulfilled' ? wiki.value : []),
    ...(commons.status === 'fulfilled' ? commons.value : []),
  ];
  const seen = new Set<string>();
  const filtered = results.filter((result) => {
    const key = result.thumbnailUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return !/\b(pdf|document)\b/i.test(result.title);
  });
  const words = trimmed.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  return filtered.sort((a, b) => scoreLogoResult(b, words) - scoreLogoResult(a, words));
}

function scoreLogoResult(result: OnlineLogoResult, words: string[]): number {
  const title = result.title.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (title.includes(word)) score += 4;
  }
  if (title.includes('logo')) score += 3;
  if (title.includes('official')) score += 2;
  if (title.includes('corporate')) score += 1;
  if (title.includes('sample')) score -= 2;
  return score;
}

export async function downloadOnlineLogo(result: OnlineLogoResult): Promise<string> {
  const base = documentDirectory;
  if (!base) {
    throw new Error('This device could not create a permanent app folder.');
  }
  const dest = `${base}bantayi_logo_online_${Date.now()}.${extFromUrl(result.thumbnailUrl)}`;
  const download = await downloadAsync(result.thumbnailUrl, dest);
  return download.uri;
}
