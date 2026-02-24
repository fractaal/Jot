import Fastify from 'fastify';
import path from 'node:path';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { marked } from 'marked';
import view from '@fastify/view';
import ejs from 'ejs';

const JOBS_DIR = process.env.JOBS_DIR || '/root/.openclaw/workspace/jobs';
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || '3131');

const app = Fastify({ logger: true });

app.register(view, {
  engine: { ejs },
  root: path.join(import.meta.dirname, 'views'),
});

async function readJobFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');

  // Parse simple header block at top (Status/Priority/Created/LastUpdated)
  // plus a best-effort title from first markdown H1
  const header = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z][A-Za-z _-]*):\s*(.+)$/);
    if (m) header[m[1].trim()] = m[2].trim();
  }
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : path.basename(filePath);

  return { raw, header, title };
}

function safeFileName(name) {
  // keep it super strict: only allow direct children .md files
  if (!name.endsWith('.md')) return null;
  if (name.includes('/') || name.includes('..') || name.includes('\\')) return null;
  return name;
}

app.get('/', async (req, reply) => {
  const entries = await fs.readdir(JOBS_DIR, { withFileTypes: true });
  const files = entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => e.name)
    .sort();

  const jobs = [];
  for (const f of files) {
    const filePath = path.join(JOBS_DIR, f);
    const { header, title } = await readJobFile(filePath);
    jobs.push({
      file: f,
      title,
      status: header.Status || '',
      priority: header.Priority || '',
      lastUpdated: header.LastUpdated || '',
      created: header.Created || '',
    });
  }

  // Sort: P0 then P1 then P2, then LastUpdated desc, then filename
  const pRank = p => (p === 'P0' ? 0 : p === 'P1' ? 1 : p === 'P2' ? 2 : 9);
  jobs.sort((a, b) => {
    const pr = pRank(a.priority) - pRank(b.priority);
    if (pr !== 0) return pr;
    const lu = (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
    if (lu !== 0) return lu;
    return a.file.localeCompare(b.file);
  });

  return reply.view('index.ejs', { jobs, jobsDir: JOBS_DIR });
});

app.get('/job/:file', async (req, reply) => {
  const file = safeFileName(req.params.file);
  if (!file) return reply.code(400).send('Bad file name');

  const filePath = path.join(JOBS_DIR, file);
  const { raw, header, title } = await readJobFile(filePath);
  const html = marked.parse(raw);

  return reply.view('job.ejs', { file, title, header, raw, html });
});

app.get('/favicon.png', async (req, reply) => {
  const iconPath = path.join(import.meta.dirname, 'public', 'favicon.png');
  const buf = await fs.readFile(iconPath);
  reply.type('image/png').send(buf);
});

app.get('/favicon.ico', async (req, reply) => reply.code(302).header('Location', '/favicon.png').send());

app.get('/health', async () => ({ ok: true }));

app.listen({ host: HOST, port: PORT });
