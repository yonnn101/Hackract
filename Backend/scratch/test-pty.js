import pty from 'node-pty';
import os from 'os';

console.log('Testing node-pty...');
try {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env
    });

    console.log('PTY spawned successfully');
    ptyProcess.onData((data) => {
        console.log('Data from PTY:', data);
        ptyProcess.kill();
        process.exit(0);
    });
    ptyProcess.write('echo "hello from pty"\r');
} catch (err) {
    console.error('Failed to spawn PTY:', err);
    process.exit(1);
}
