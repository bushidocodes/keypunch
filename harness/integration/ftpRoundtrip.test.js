// Integration smoke at the protocol layer: drive the mock z/OS FTP/JES server
// with the same `promise-ftp` client `app/utils/jesFtp.js` uses, running the
// same command sequences (ascii -> site -> list/get/put/delete/cwd), and feed
// the raw responses through the real parsers. This exercises the full FTP
// round-trip + parsing without needing the Electron GUI or the Redux store.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import PromiseFtp from 'promise-ftp';
import { createMockJesServer } from '../mock-server.js';
import { parseJobs, parseDatasets, parseMembers } from '../../app/utils/jesParse.js';

const srv = createMockJesServer();
let port;

beforeAll(async () => { port = await srv.listen(); });
afterAll(async () => { await srv.close(); });
beforeEach(() => { srv.reseed(); }); // reset to the baseline fixture before each test

function connect() {
  const ftp = new PromiseFtp();
  return ftp
    .connect({ host: '127.0.0.1', port, user: 'IBMUSER', password: 'secret' })
    .then(() => ftp);
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let data = '';
    stream.on('data', (c) => { data += c.toString(); });
    stream.on('end', () => resolve(data));
    stream.on('error', reject);
    // node-ftp hands back a paused data socket; on modern Node, attaching a
    // 'data' listener to an explicitly-paused stream does NOT auto-resume it,
    // so we must resume explicitly. (The app's jesFtp.js omits this — a latent
    // bug to address when FTP moves to the main process in Phase 3.)
    stream.resume();
  });
}

describe('mock JES FTP round-trip', () => {
  it('walks the core Keypunch user journey end to end', async () => {
    const ftp = await connect();
    await ftp.ascii();

    // --- Results pane: poll the JES queue ---
    await ftp.site('FILETYPE=JES');
    const jobRows = await ftp.list('');
    expect(jobRows).toEqual([
      'IBMUSER JOB00045 OUTPUT 3 Spool Files',
      'IBMUSER JOB00046 ACTIVE'
    ]);
    const jobs = parseJobs(jobRows);
    expect(jobs.JOB00045.status).toBe('OUTPUT');
    expect(jobs.JOB00045.numberOfSpoolFiles).toBe('3');
    expect(jobs.JOB00046.numberOfSpoolFiles).toBeNull();

    // --- Retrieve a job's spool output (RETR <jobID>.x) ---
    const out = await streamToString(await ftp.get('JOB00045.x'));
    expect(out).toMatch(/HELLO WORLD FROM JES/);

    // --- Submit ("easy button"): STOR adds a new job to the queue ---
    await ftp.put(Buffer.from('//IBMUSER JOB\n// EXEC PGM=IEFBR14\n'), '/');
    const afterSubmit = parseJobs(await ftp.list(''));
    expect(afterSubmit.JOB00100).toBeDefined();
    expect(afterSubmit.JOB00100.status).toBe('OUTPUT');

    // --- Delete a job ---
    await ftp.delete('JOB00046');
    const afterDelete = parseJobs(await ftp.list(''));
    expect(afterDelete.JOB00046).toBeUndefined();

    // --- Explorer pane: list datasets ---
    await ftp.site('FILETYPE=SEQ');
    const datasets = parseDatasets(await ftp.list(''));
    expect(datasets.map((d) => d.name)).toEqual(['IBMUSER.SOURCE', 'IBMUSER.JCL']);

    // --- Explorer: list members of a PDS ---
    await ftp.cwd('IBMUSER.SOURCE');
    const members = parseMembers(await ftp.list(''), 'IBMUSER.SOURCE');
    expect(members.map((m) => m.name)).toEqual(['HELLO', 'COBOL1']);
    await ftp.cwd('~');

    // --- Explorer: open a member into the editor (RETR <member>) ---
    await ftp.cwd('IBMUSER.SOURCE');
    const memberSrc = await streamToString(await ftp.get('HELLO'));
    expect(memberSrc).toMatch(/PROGRAM-ID\. HELLO\./);
    await ftp.cwd('~');

    await ftp.end();
  });

  it('reseed resets the queue so submitted jobs do not leak between runs', async () => {
    const ftp = await connect();
    await ftp.ascii();
    await ftp.site('FILETYPE=JES');
    const jobs = parseJobs(await ftp.list(''));
    // JOB00100 from the previous test must NOT be present after reseed.
    expect(Object.keys(jobs).sort()).toEqual(['JOB00045', 'JOB00046']);
    await ftp.end();
  });

  it('reports the empty-queue informational message as zero jobs', async () => {
    // Drain the baseline queue, then confirm the parser yields {}.
    const ftp = await connect();
    await ftp.ascii();
    await ftp.site('FILETYPE=JES');
    await ftp.delete('JOB00045');
    await ftp.delete('JOB00046');
    const rows = await ftp.list('');
    expect(rows).toEqual(['No jobs found on Held queue']);
    expect(parseJobs(rows)).toEqual({});
    await ftp.end();
  });
});
