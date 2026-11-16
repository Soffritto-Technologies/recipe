import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SELF = 'test/repo.test.mjs';
const LEAK_TERMS = ['Ben', 'Moskoff', 'PineChat', 'Pinecone', 'pinecone-mono', 'Sipho', 'Jev', 'bmoski8'];
const LEAK_PATTERNS = [
  ...LEAK_TERMS.map((t) => new RegExp(`\\b${t}\\b`, 'i')),
  /claude\.ai\/artifact\//i,
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
];
const TEXT_EXT = /\.(md|json|html|mjs|sh|yml|yaml|txt)$/;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);

/**
 * Reads a repo file as text.
 *
 * @param {string} rel - Path relative to the repo root.
 * @returns {string} The file contents.
 */
function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/**
 * Lists every text file in the repo, as paths relative to the root.
 *
 * @param {string} [dir] - Folder to walk (absolute).
 * @returns {string[]} Relative paths using forward slashes.
 */
function textFiles(dir = ROOT) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...textFiles(full));
    } else if (TEXT_EXT.test(name) || name === '.gitignore' || name === 'LICENSE') {
      out.push(relative(ROOT, full).split('\\').join('/'));
    }
  }
  return out;
}

/**
 * Collects every CSS class the skill tells Claude to use.
 *
 * @param {string} skill - The SKILL.md text.
 * @returns {Set<string>} Class names.
 */
function classesInSkill(skill) {
  const found = new Set();
  for (const m of skill.matchAll(/\b(?:rect|text|path|circle)\.([a-z][\w-]*)/g)) found.add(m[1]);
  for (const m of skill.matchAll(/`\.([a-z][\w-]*)`/g)) found.add(m[1]);
  for (const m of skill.matchAll(/`((?:t|s|p|tag|ar|al|ah)-[a-z]+(?:-[a-z]+)*)`/g)) found.add(m[1]);
  for (const m of skill.matchAll(/`class="([a-z][\w-]*)"/g)) found.add(m[1]);
  for (const c of [...found]) if (c.startsWith('p-') && c !== 'p-code') found.add(`${c}-t`);
  found.add('p-code-t');
  return found;
}

/**
 * Collects every class selector defined in the template's style block.
 *
 * @param {string} html - The template text.
 * @returns {Set<string>} Class names.
 */
function classesInTemplate(html) {
  const style = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  return new Set([...style.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
}

describe('plugin manifests', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));

  test('parse and names match', () => {
    assert.equal(plugin.name, 'recipe');
    assert.equal(market.name, 'recipe');
    assert.equal(market.plugins.length, 1);
    assert.equal(market.plugins[0].name, plugin.name);
    assert.equal(market.plugins[0].source, './');
  });

  test('plugin.json has the required fields', () => {
    assert.equal(plugin.version, '0.1.0');
    assert.equal(plugin.license, 'MIT');
    assert.equal(plugin.author.name, 'Soffritto Technologies');
    assert.ok(plugin.keywords.length > 0);
  });
});

describe('SKILL.md', () => {
  const skill = read('skills/recipe/SKILL.md');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skill)?.[1] || '';

  test('frontmatter names the skill and describes it', () => {
    assert.match(frontmatter, /^name: recipe\s*$/m);
    assert.match(frontmatter, /^description: .{40,}/m);
  });

  test('every class it names exists in the template', () => {
    const defined = classesInTemplate(read('skills/recipe/assets/page-template.html'));
    const missing = [...classesInSkill(skill)].filter((c) => !defined.has(c));
    assert.deepEqual(missing, []);
  });

  test('names the generic AI pill classes', () => {
    for (const c of ['p-ai-a', 'p-ai-b', 'p-ai-c', 'p-code']) assert.ok(skill.includes(`\`${c}\``), c);
  });
});

describe('docs/sample.html', () => {
  const html = read('docs/sample.html');
  const svgs = html.match(/<svg\b[^>]*>/g) || [];

  test('has svgs, each with role="img" and an aria-label', () => {
    assert.ok(svgs.length >= 2);
    for (const tag of svgs) {
      assert.match(tag, /role="img"/);
      assert.match(tag, /aria-label="[^"]+"/);
    }
  });

  test('has no duplicate element ids', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('uses only classes the template defines', () => {
    const defined = classesInTemplate(read('skills/recipe/assets/page-template.html'));
    const used = new Set([...html.matchAll(/\sclass="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
    assert.deepEqual([...used].filter((c) => !defined.has(c)), []);
  });
});

describe('repo hygiene', () => {
  const files = textFiles().filter((f) => f !== SELF);

  test('no personal or private references leak', () => {
    const hits = [];
    for (const f of files) {
      for (const re of LEAK_PATTERNS) if (re.test(read(f))) hits.push(`${f}: ${re}`);
    }
    assert.deepEqual(hits, []);
  });

  test('the word FigJam appears only in the SKILL.md description line', () => {
    const hits = [];
    for (const f of files) {
      read(f).split(/\r?\n/).forEach((line, i) => {
        if (/figjam/i.test(line) && !(f === 'skills/recipe/SKILL.md' && line.startsWith('description:'))) hits.push(`${f}:${i + 1}`);
      });
    }
    assert.deepEqual(hits, []);
  });
});
