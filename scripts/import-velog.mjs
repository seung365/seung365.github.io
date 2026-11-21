// velog 글을 src/content/posts/*.md 로 가져온다. 다시 돌리면 덮어쓴다.
// ponytail: 이미지는 velog CDN URL 그대로 둔다. velog 탈퇴 전엔 로컬로 내려받아야 함.
import { writeFile, mkdir } from 'node:fs/promises';

const USERNAME = process.argv[2] ?? 'seung365';
const OUT = new URL('../src/content/posts/', import.meta.url);

const gql = async (query, variables) => {
  const res = await fetch('https://v2.velog.io/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
};

const list = [];
for (let cursor; ; ) {
  const { posts } = await gql(
    'query($u:String,$c:ID){ posts(username:$u, cursor:$c, limit:50){ id url_slug } }',
    { u: USERNAME, c: cursor },
  );
  list.push(...posts);
  if (posts.length < 50) break;
  cursor = posts.at(-1).id;
}

await mkdir(OUT, { recursive: true });
for (const { url_slug } of list) {
  const { post } = await gql(
    'query($u:String,$s:String){ post(username:$u, url_slug:$s){ title short_description body tags thumbnail released_at updated_at } }',
    { u: USERNAME, s: url_slug },
  );
  const slug = url_slug.replace(/[\\/:*?"<>|]/g, '-');
  const fm = [
    `title: ${JSON.stringify(post.title.trim())}`,
    `description: ${JSON.stringify((post.short_description ?? '').replace(/\s+/g, ' ').trim())}`,
    `published: ${post.released_at}`,
    post.updated_at !== post.released_at && `updated: ${post.updated_at}`,
    post.tags?.length && `tags: ${JSON.stringify(post.tags)}`,
    post.thumbnail && `image: ${JSON.stringify(post.thumbnail)}`,
  ].filter(Boolean);
  await writeFile(new URL(`${slug}.md`, OUT), `---\n${fm.join('\n')}\n---\n\n${post.body.trim().replace(/^(```+) *(\S+) *$/gm, (_, f, l) => f + l.toLowerCase())}\n`);
  console.log('✓', post.title.trim());
}
console.log(`${list.length}개 가져옴`);
