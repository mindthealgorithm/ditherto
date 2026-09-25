import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
let building = false;
let pending = false;
let timer;
function build() {
  if (building) { pending = true; return; }
  building = true;
  const child = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  child.on('exit', () => {
    building = false;
    if (pending) { pending = false; build(); }
  });
}
watch('src', { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 100); });
build();
