// Minimal mock z/OS FTP / JES server for the Keypunch verification harness.
//
// It speaks just enough of the FTP protocol for the `promise-ftp`/`ftp` client
// that `app/utils/jesFtp.js` uses, plus the MVS-specific behaviour Keypunch
// relies on: `SITE FILETYPE=JES|SEQ`, JES job listings, dataset/member
// listings, job-output retrieval (`RETR <jobID>.x`), job submission (`STOR`),
// and job deletion (`DELE`). It is intentionally permissive and in-memory.
//
// Usage:
//   const srv = createMockJesServer();
//   const port = await srv.listen();   // ephemeral port on 127.0.0.1
//   ...drive it with an FTP client...
//   srv.reseed();                      // reset state to the baseline fixture
//   await srv.close();

import net from 'net';
import { once } from 'events';
import { makeFixture } from './fixture.js';

export function createMockJesServer() {
  const ctx = { state: makeFixture() };

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    const conn = {
      type: 'A',
      cwd: 'HOME',
      filetype: null,
      currentDataset: null,
      dataServer: null,
      dataSocketPromise: null
    };
    const DEBUG = !!process.env.MOCK_DEBUG;
    const send = (line) => {
      if (DEBUG) console.error('  S>', line);
      socket.write(line + '\r\n');
    };

    send('220 Mock z/OS FTP service ready.');

    let buffer = '';
    const queue = [];
    let processing = false;

    socket.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        queue.push(buffer.slice(0, idx).replace(/\r$/, ''));
        buffer = buffer.slice(idx + 1);
      }
      pump();
    });
    socket.on('error', () => {});

    async function pump() {
      if (processing) return;
      processing = true;
      while (queue.length) {
        const line = queue.shift();
        try {
          await handle(line);
        } catch (e) {
          try { send('451 ' + e.message); } catch (_) {}
        }
      }
      processing = false;
    }

    function openPasv() {
      if (conn.dataServer) { try { conn.dataServer.close(); } catch (_) {} }
      const dataServer = net.createServer();
      conn.dataServer = dataServer;
      conn.dataSocketPromise = new Promise((resolve) => {
        dataServer.once('connection', (ds) => {
          if (DEBUG) console.error('  [data] client connected');
          ds.setNoDelay(true);
          resolve(ds);
        });
      });
      dataServer.listen(0, '127.0.0.1', () => {
        const port = dataServer.address().port;
        send(`227 Entering Passive Mode (127,0,0,1,${Math.floor(port / 256)},${port % 256}).`);
      });
    }

    async function sendOverData(payload) {
      const ds = await conn.dataSocketPromise;
      if (DEBUG) console.error('  [data] writing', Buffer.byteLength(payload), 'bytes; writable=', ds.writable, 'destroyed=', ds.destroyed);
      // Write the payload and FIN our side. Resolve once the data is flushed —
      // do NOT wait for the client to close its half, or RETR deadlocks: the
      // client keeps the data socket open until it sees the 226 we send next.
      await new Promise((resolve) => ds.end(payload, resolve));
      if (DEBUG) console.error('  [data] flushed + FIN');
      if (conn.dataServer) conn.dataServer.close();
    }

    function listingFor() {
      const s = ctx.state;
      if (conn.filetype === 'JES') {
        const lines = Object.keys(s.jobs).map((id) => s.jobs[id]);
        return lines.length ? lines : ['No jobs found on Held queue'];
      }
      if (!conn.currentDataset) {
        return [s.datasetHeader, ...s.datasets];
      }
      return [s.memberHeader, ...(s.members[conn.currentDataset] || [])];
    }

    function fileFor(arg) {
      const s = ctx.state;
      if (conn.filetype === 'JES' && /\.x$/i.test(arg)) {
        return s.jobOutputs[arg.replace(/\.x$/i, '')];
      }
      const ds = conn.currentDataset;
      if (ds && s.memberContents[ds]) return s.memberContents[ds][arg];
      return undefined;
    }

    async function handle(raw) {
      if (DEBUG) console.error('C<', JSON.stringify(raw));
      const sp = raw.indexOf(' ');
      const verb = (sp === -1 ? raw : raw.slice(0, sp)).toUpperCase();
      const arg = sp === -1 ? '' : raw.slice(sp + 1).trim();

      switch (verb) {
        case 'USER': return send('331 Send password.');
        case 'PASS': return send('230 User logged in, proceed.');
        case 'FEAT': return socket.write('211-Features:\r\n211 End.\r\n');
        case 'SYST': return send('215 MVS is the operating system of this server.');
        case 'OPTS': return send('200 OK.');
        case 'NOOP': return send('200 OK.');
        case 'TYPE': conn.type = arg; return send('200 Type set to ' + arg + '.');
        case 'SITE': {
          const m = /FILETYPE=(\w+)/i.exec(arg);
          if (m) conn.filetype = m[1].toUpperCase();
          return send('200 SITE command was accepted.');
        }
        case 'PWD': return send(`257 "${conn.cwd}" is working directory.`);
        case 'CWD': {
          if (arg === '~' || arg === '') {
            conn.cwd = 'HOME';
            conn.currentDataset = null;
          } else {
            conn.cwd = arg;
            if (conn.filetype === 'SEQ') conn.currentDataset = arg;
          }
          return send('250 Directory changed to ' + conn.cwd + '.');
        }
        case 'PASV': return openPasv();
        case 'LIST':
        case 'NLST': {
          send('150 Opening ASCII mode data connection for file list.');
          await sendOverData(listingFor().join('\r\n') + '\r\n');
          return send('226 Transfer complete.');
        }
        case 'RETR': {
          const content = fileFor(arg);
          if (content == null) return send('550 ' + arg + ': not found.');
          send('150 Opening data connection.');
          await sendOverData(content);
          return send('226 Transfer complete.');
        }
        case 'STOR': {
          send('150 Opening data connection.');
          const ds = await conn.dataSocketPromise;
          ds.on('data', () => {});
          await once(ds, 'end');
          ds.end();
          if (conn.dataServer) conn.dataServer.close();
          if (conn.filetype === 'JES') {
            const id = 'JOB' + String(ctx.state.jobCounter++).padStart(5, '0');
            ctx.state.jobs[id] = `${ctx.state.submitOwner} ${id} OUTPUT 1 Spool Files`;
            ctx.state.jobOutputs[id] = `1 SUBMITTED JOB ${id}\n IEF142I ${id} - COND CODE 0000\n`;
          }
          return send('226 Transfer complete.');
        }
        case 'DELE': {
          const id = arg.replace(/\.x$/i, '');
          if (ctx.state.jobs[id]) {
            delete ctx.state.jobs[id];
            return send('250 Job ' + id + ' deleted.');
          }
          return send('550 ' + arg + ': not found.');
        }
        case 'MODE': return send('200 Mode set to ' + arg + '.');
        case 'QUIT': send('221 Goodbye.'); return socket.end();
        default: return send('502 Command ' + verb + ' not implemented.');
      }
    }
  });

  return {
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => resolve(server.address().port));
      });
    },
    reseed() { ctx.state = makeFixture(); },
    state() { return ctx.state; },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}
