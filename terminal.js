/* Simulated Linux terminal. Nothing here touches a real system. */
(function () {
  const body = document.getElementById('termBody');
  const form = document.getElementById('termForm');
  const input = document.getElementById('termInput');
  const promptEl = document.getElementById('termPrompt');
  if (!body) return;

  const USER = 'admin', HOST = 'ubuntu';
  let cwd = '/home/admin';
  const history = []; let hIdx = 0;

  // tiny virtual file system
  const fs = {
    '/': ['home', 'etc', 'var'],
    '/home': ['admin'],
    '/home/admin': ['about.txt', 'skills.txt', 'tools.txt', 'projects'],
    '/home/admin/projects': ['portfolio', 'backup.sh'],
    '/etc': ['hostname', 'os-release'],
    '/var': ['log']
  };
  const files = {
    '/home/admin/about.txt': 'Your Name\nAspiring system administrator.\nI keep systems calm, secure, and running.',
    '/home/admin/skills.txt': 'Technical: OS admin, networking, scripting, security\nProfessional: problem-solving, communication, documentation, time management',
    '/home/admin/tools.txt': 'Windows Server, Ubuntu Server, PowerShell, SSH, VirtualBox, Wireshark',
    '/home/admin/projects/backup.sh': '#!/bin/bash\n# nightly backup\ntar -czf /backup/home-$(date +%F).tar.gz /home/admin',
    '/etc/hostname': HOST,
    '/etc/os-release': 'NAME="Ubuntu"\nVERSION="24.04 LTS (Noble Numbat)"'
  };

  const shortCwd = () => cwd === '/home/admin' ? '~' : cwd.replace('/home/admin', '~');
  const setPrompt = () => { promptEl.textContent = `${USER}@${HOST}:${shortCwd()}$`; };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const print = (t = '', cls = '') => { body.insertAdjacentHTML('beforeend', `<div${cls ? ` class="${cls}"` : ''}>${esc(t)}</div>`); body.scrollTop = body.scrollHeight; };
  const resolve = p => {
    if (!p || p === '~') return '/home/admin';
    let parts = (p.startsWith('/') ? p : cwd + '/' + p).split('/').filter(Boolean), out = [];
    parts.forEach(x => x === '..' ? out.pop() : x !== '.' && out.push(x));
    return '/' + out.join('/');
  };

  const commands = {
    help() {
      return ['Available commands:',
        '  help        show this list        ls / cd / pwd   move around',
        '  cat <file>  read a file           whoami          current user',
        '  uname -a    system info           hostname        machine name',
        '  date        date and time         uptime          how long running',
        '  df -h       disk usage            free -h         memory usage',
        '  ip a        network addresses     ping <host>     test connection',
        '  ps          processes             top             live usage snapshot',
        '  systemctl status ssh              neofetch        system summary',
        '  mkdir <d>   make folder           history         past commands',
        '  echo <txt>  print text            clear           clean screen'].join('\n');
    },
    pwd: () => cwd,
    whoami: () => USER,
    hostname: () => HOST,
    date: () => new Date().toString(),
    uptime: () => ' up 14 days, 3:21,  1 user,  load average: 0.08, 0.12, 0.09',
    uname: a => a.includes('-a') ? `Linux ${HOST} 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux` : 'Linux',
    ls(a) {
      const dir = resolve(a.find(x => !x.startsWith('-')));
      return fs[dir] ? fs[dir].join('  ') : `ls: cannot access '${a[0]}': No such file or directory`;
    },
    cd(a) {
      const dir = resolve(a[0]);
      if (fs[dir]) { cwd = dir; setPrompt(); return ''; }
      return `bash: cd: ${a[0]}: No such file or directory`;
    },
    cat(a) {
      if (!a[0]) return 'cat: missing file name';
      const f = resolve(a[0]);
      return files[f] ?? `cat: ${a[0]}: No such file or directory`;
    },
    mkdir(a) {
      if (!a[0]) return 'mkdir: missing operand';
      const d = resolve(a[0]), parent = d.slice(0, d.lastIndexOf('/')) || '/';
      if (!fs[parent]) return `mkdir: cannot create directory '${a[0]}'`;
      fs[parent].push(d.split('/').pop()); fs[d] = []; return '';
    },
    echo: a => a.join(' '),
    df: () => ['Filesystem      Size  Used Avail Use% Mounted on',
      '/dev/sda2        50G   18G   30G  38% /', '/dev/sda1       512M  6.1M  506M   2% /boot/efi', 'tmpfs           2.0G     0  2.0G   0% /dev/shm'].join('\n'),
    free: () => ['               total   used   free  shared  buff/cache  available',
      'Mem:           3.8Gi  1.1Gi  1.6Gi   24Mi       1.1Gi       2.5Gi', 'Swap:          2.0Gi     0B  2.0Gi'].join('\n'),
    ip: () => ['1: lo: <LOOPBACK,UP> mtu 65536', '    inet 127.0.0.1/8 scope host lo',
      '2: enp0s3: <BROADCAST,MULTICAST,UP> mtu 1500', '    inet 192.168.1.10/24 brd 192.168.1.255 scope global enp0s3'].join('\n'),
    ps: () => ['  PID TTY          TIME CMD', '    1 ?        00:00:03 systemd', '  612 ?        00:00:00 sshd', '  980 pts/0    00:00:00 bash', ' 1204 pts/0    00:00:00 ps'].join('\n'),
    top: () => ['top - ' + new Date().toLocaleTimeString() + ' up 14 days, load average: 0.08, 0.12, 0.09',
      'Tasks: 112 total, 1 running | %Cpu(s): 3.2 us, 1.1 sy, 95.7 id', 'MiB Mem: 3891 total, 1640 free, 1130 used',
      '  PID USER   %CPU %MEM COMMAND', '  612 root    0.3  0.4 sshd', '  720 mysql   0.9  6.2 mysqld', ' 1010 www     0.4  1.8 nginx'].join('\n'),
    systemctl(a) {
      if (a[0] === 'status' && a[1]) return [`● ${a[1]}.service - OpenBSD Secure Shell server`, '     Loaded: loaded (/lib/systemd/system/' + a[1] + '.service; enabled)',
        '     Active: active (running) since Mon 2026-10-05 08:00:12 PST; 2 weeks ago', '   Main PID: 612 (sshd)'].join('\n');
      return 'Usage: systemctl status <service>';
    },
    ping(a) {
      const h = a[0] || 'localhost';
      return [`PING ${h} 56(84) bytes of data.`, `64 bytes from ${h}: icmp_seq=1 ttl=117 time=12.4 ms`, `64 bytes from ${h}: icmp_seq=2 ttl=117 time=11.9 ms`,
        `64 bytes from ${h}: icmp_seq=3 ttl=117 time=12.8 ms`, `--- ${h} ping statistics ---`, '3 packets transmitted, 3 received, 0% packet loss'].join('\n');
    },
    sudo: a => a.length ? `[sudo] password for ${USER}: \n${USER} is not in the sudoers file. This incident will be reported. (just kidding)` : 'usage: sudo <command>',
    history: () => history.map((c, i) => `${String(i + 1).padStart(4)}  ${c}`).join('\n'),
    neofetch: () => [`${USER}@${HOST}`, '-----------------', 'OS: Ubuntu 24.04 LTS x86_64', 'Kernel: 6.8.0-45-generic', 'Uptime: 14 days',
      'Shell: bash 5.2', 'CPU: 2 cores @ 2.4GHz', 'Memory: 1130MiB / 3891MiB', 'Role: Aspiring System Administrator ✦'].join('\n'),
    clear() { body.innerHTML = ''; return ''; },
    exit: () => 'logout (this is a demo, so you stay connected ✦)'
  };

  function run(line) {
    print(`${USER}@${HOST}:${shortCwd()}$ ${line}`, 'p');
    const t = line.trim(); if (!t) return;
    history.push(t); hIdx = history.length;
    const [cmd, ...args] = t.split(/\s+/);
    if (!commands[cmd]) { print(`${cmd}: command not found. Type 'help' to see what works.`, 'e'); return; }
    const out = commands[cmd](args);
    if (out) print(out);
  }

  form.addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && history.length) { hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; e.preventDefault(); }
    if (e.key === 'Tab') { // simple tab-complete for commands
      e.preventDefault();
      const m = Object.keys(commands).filter(c => c.startsWith(input.value.trim()));
      if (m.length === 1) input.value = m[0] + ' ';
    }
  });
  document.getElementById('term').addEventListener('click', () => input.focus({ preventScroll: true }));
  document.getElementById('chips').addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') run(e.target.textContent);
  });

  setPrompt();
  print('Welcome to Ubuntu 24.04 LTS (simulated) ✦', 'd');
  print("Type 'help' to see available commands.\n", 'd');
})();
