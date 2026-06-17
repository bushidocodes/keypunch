import { describe, it, expect } from 'vitest';
import {
  parseJobs,
  parseDatasets,
  parseMembers,
  NO_JOBS_MESSAGE
} from '../../app/utils/jesParse';

describe('parseJobs', () => {
  it('parses a JES held-queue listing into a map keyed by job ID', () => {
    const jobs = parseJobs([
      'IBMUSER JOB00045 OUTPUT 3 Spool Files',
      'IBMUSER JOB00046 ACTIVE'
    ]);
    expect(Object.keys(jobs)).toEqual(['JOB00045', 'JOB00046']);
    expect(jobs.JOB00045).toEqual({
      owner: 'IBMUSER',
      status: 'OUTPUT',
      numberOfSpoolFiles: '3',
      jobID: 'JOB00045',
      fullString: 'IBMUSER JOB00045 OUTPUT 3 Spool Files'
    });
  });

  it('returns null spool count when the line has no "Spool Files"', () => {
    const jobs = parseJobs(['IBMUSER JOB00046 ACTIVE']);
    expect(jobs.JOB00046.numberOfSpoolFiles).toBeNull();
    expect(jobs.JOB00046.status).toBe('ACTIVE');
  });

  it('returns an empty map for the known empty-queue message', () => {
    expect(parseJobs([NO_JOBS_MESSAGE])).toEqual({});
  });

  it('throws when the queue could not be read at all', () => {
    expect(() => parseJobs([])).toThrow(/Unable to retrieve jobs/);
    expect(() => parseJobs(null)).toThrow(/Unable to retrieve jobs/);
  });
});

describe('parseDatasets', () => {
  const rows = [
    'Volume Unit Referred Ext Used Recfm Lrecl BlkSz Dsorg Dsname',
    'VPWRKA 3390 2017/01/01 1 15 FB 80 27920 PO IBMUSER.SOURCE',
    'VPWRKB 3390 2017/01/02 1 5 FB 80 27920 PS IBMUSER.JCL'
  ];

  it('drops the header row and maps each dataset to a tree node', () => {
    const datasets = parseDatasets(rows);
    expect(datasets).toHaveLength(2);
    expect(datasets[0].name).toBe('IBMUSER.SOURCE');
    expect(datasets[0].toggled).toBe(false);
    expect(datasets[0].children).toEqual([]);
    expect(datasets[0].attributes).toMatchObject({
      volume: 'VPWRKA',
      dsorg: 'PO',
      dsname: 'IBMUSER.SOURCE'
    });
    expect(datasets[1].attributes.dsorg).toBe('PS');
  });

  it('throws when nothing came back', () => {
    expect(() => parseDatasets([])).toThrow(/Unable to list datasets/);
  });
});

describe('parseMembers', () => {
  const rows = [
    ' Name VV.MM Created Changed Size Init Mod Id',
    'HELLO 01.01 2017/01/01 2017/01/02 20 20 0 IBMUSER',
    'COBOL1 01.00 2017/01/01 2017/01/01 50 50 0 IBMUSER'
  ];

  it('drops the header row and maps members, tagging the owning dsname', () => {
    const members = parseMembers(rows, 'IBMUSER.SOURCE');
    expect(members.map((m) => m.name)).toEqual(['HELLO', 'COBOL1']);
    expect(members[0].attributes).toEqual({
      name: 'HELLO',
      vvmm: '01.01',
      created: '2017/01/01',
      changed: '2017/01/02',
      size: '20',
      init: '20',
      mod: '0',
      id: 'IBMUSER',
      dsorg: '',
      dsname: 'IBMUSER.SOURCE'
    });
  });

  it('returns an empty array for an empty/headers-only listing', () => {
    expect(parseMembers([], 'IBMUSER.JCL')).toEqual([]);
    expect(parseMembers([' Name VV.MM Created'], 'IBMUSER.JCL')).toEqual([]);
  });
});
