// Standalone launcher for the mock z/OS FTP/JES server, for manual GUI smoke
// testing. Start this, then point Keypunch's Config pane at the printed host/port.
//
//   npm run mock        # in harness/  (default port 2121)
//   MOCK_PORT=2100 npm run mock

import { createMockJesServer } from './mock-server';

const PORT = Number(process.env.MOCK_PORT || 2121);
const srv = createMockJesServer();
const port = await srv.listen(PORT);

console.log(`Mock z/OS FTP/JES server listening on 127.0.0.1:${port}`);
console.log('');
console.log('Point Keypunch Config at:');
console.log(`    host = 127.0.0.1   port = ${port}   user = IBMUSER   password = (anything)`);
console.log('');
console.log('Seeded baseline:');
console.log('    Jobs:     JOB00045 (OUTPUT, 3 spool files), JOB00046 (ACTIVE)');
console.log('    Datasets: IBMUSER.SOURCE (PO; members HELLO, COBOL1), IBMUSER.JCL (PS)');
console.log('');
console.log('Press Ctrl+C to stop.');

process.on('SIGINT', async () => {
  await srv.close();
  process.exit(0);
});
