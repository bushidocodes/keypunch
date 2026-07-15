// Integration smoke at the protocol layer: drive the mock z/OS FTP/JES server
// with `basic-ftp` (the same client electron/main.ts uses), running the same
// command sequences (TYPE A -> SITE -> LIST/RETR/STOR/DELE/CWD), and feed the
// raw responses through the real parsers.  This exercises the full FTP
// round-trip + parsing without needing the Electron GUI or the Redux store.

import { Client } from 'basic-ftp';
import { PassThrough, Writable } from 'stream';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  parseDatasets,
  parseJobs,
  parseMembers,
} from '../../app/utils/jesParse';
import { createMockJesServer } from '../mock-server';

const srv = createMockJesServer();
let port: number;

beforeAll(async () => {
  port = await srv.listen();
});
afterAll(async () => {
  await srv.close();
});
beforeEach(() => {
  srv.reseed();
}); // reset to the baseline fixture before each test

async function connect(): Promise<Client> {
  const client = new Client();
  await client.access({
    host: '127.0.0.1',
    port,
    user: 'IBMUSER',
    password: 'secret',
    secure: false,
  });
  return client;
}

// basic-ftp parses LIST into FileInfo objects; our renderer parsers expect raw
// MVS listing strings.  Override parseList temporarily to capture raw lines.
async function rawList(client: Client): Promise<string[]> {
  let rawLines: string[] = [];
  const saved = client.parseList;
  client.parseList = (raw: string) => {
    rawLines = raw.split(/\r?\n/).filter(Boolean);
    return [];
  };
  try {
    await client.list();
  } finally {
    client.parseList = saved;
  }
  return rawLines;
}

async function downloadToString(
  client: Client,
  remotePath: string
): Promise<string> {
  const chunks: Buffer[] = [];
  const dest = new Writable({
    write(chunk, _, cb) {
      chunks.push(chunk);
      cb();
    },
  });
  await client.downloadTo(dest, remotePath);
  return Buffer.concat(chunks).toString();
}

describe('mock JES FTP round-trip', () => {
  it('walks the core Keypunch user journey end to end', async () => {
    const client = await connect();
    await client.send('TYPE A');

    // --- Results pane: poll the JES queue ---
    await client.send('SITE FILETYPE=JES');
    const jobRows = await rawList(client);
    expect(jobRows).toEqual([
      'IBMUSER JOB00045 OUTPUT 3 Spool Files',
      'IBMUSER JOB00046 ACTIVE',
    ]);
    const jobs = parseJobs(jobRows);
    expect(jobs.JOB00045.status).toBe('OUTPUT');
    expect(jobs.JOB00045.numberOfSpoolFiles).toBe('3');
    expect(jobs.JOB00046.numberOfSpoolFiles).toBeNull();

    // --- Retrieve a job's spool output (RETR <jobID>.x) ---
    const out = await downloadToString(client, 'JOB00045.x');
    expect(out).toMatch(/HELLO WORLD FROM JES/);

    // --- Submit ("easy button"): STOR adds a new job to the queue ---
    const src = new PassThrough();
    src.end(Buffer.from('//IBMUSER JOB\n// EXEC PGM=IEFBR14\n'));
    await client.uploadFrom(src, '/');
    const afterSubmit = parseJobs(await rawList(client));
    expect(afterSubmit.JOB00100).toBeDefined();
    expect(afterSubmit.JOB00100.status).toBe('OUTPUT');

    // --- Delete a job ---
    await client.remove('JOB00046');
    const afterDelete = parseJobs(await rawList(client));
    expect(afterDelete.JOB00046).toBeUndefined();

    // --- Explorer pane: list datasets ---
    await client.send('SITE FILETYPE=SEQ');
    const datasets = parseDatasets(await rawList(client));
    expect(datasets.map((d) => d.name)).toEqual([
      'IBMUSER.SOURCE',
      'IBMUSER.JCL',
    ]);

    // --- Explorer: list members of a PDS ---
    await client.cd('IBMUSER.SOURCE');
    const members = parseMembers(await rawList(client), 'IBMUSER.SOURCE');
    expect(members.map((m) => m.name)).toEqual(['HELLO', 'COBOL1']);
    await client.cd('~');

    // --- Explorer: open a member into the editor (RETR <member>) ---
    await client.cd('IBMUSER.SOURCE');
    const memberSrc = await downloadToString(client, 'HELLO');
    expect(memberSrc).toMatch(/PROGRAM-ID\. HELLO\./);
    await client.cd('~');

    client.close();
  });

  it('reseed resets the queue so submitted jobs do not leak between runs', async () => {
    const client = await connect();
    await client.send('TYPE A');
    await client.send('SITE FILETYPE=JES');
    const jobs = parseJobs(await rawList(client));
    // JOB00100 from the previous test must NOT be present after reseed.
    expect(Object.keys(jobs).sort()).toEqual(['JOB00045', 'JOB00046']);
    client.close();
  });

  it('reports the empty-queue informational message as zero jobs', async () => {
    // Drain the baseline queue, then confirm the parser yields {}.
    const client = await connect();
    await client.send('TYPE A');
    await client.send('SITE FILETYPE=JES');
    await client.remove('JOB00045');
    await client.remove('JOB00046');
    const rows = await rawList(client);
    expect(rows).toEqual(['No jobs found on Held queue']);
    expect(parseJobs(rows)).toEqual({});
    client.close();
  });
});
