import { appendFileSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (pkg.name !== 'ditherto' || pkg.version !== lock.version || pkg.version !== lock.packages[''].version) {
  throw new Error('Package name or lockfile version does not match the release.');
}
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  throw new Error('This workflow publishes stable versions only (for example, 0.1.1).');
}
if (process.env.PUBLISH_PACKAGE === 'true' &&
    (process.env.GITHUB_REF_TYPE !== 'tag' || process.env.GITHUB_REF_NAME !== `v${pkg.version}`)) {
  throw new Error(`Publishing requires the tag v${pkg.version}; branch runs can only build a package.`);
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${pkg.version}\n`);
console.log(`Validated ditherto@${pkg.version} (${process.env.PUBLISH_PACKAGE === 'true' ? 'publish' : 'package only'}).`);
