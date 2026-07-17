import pty from 'node-pty';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// { workflowId: { containerName, refCount } }
const activeContainers = new Map();

// { workflowId: Promise } - To prevent race conditions during simultaneous startup
const startingContainers = new Map();

export const setupTerminalSocket = (io) => {
  const terminalNamespace = io.of('/terminal');

  terminalNamespace.on('connection', async (socket) => {
    const { workflowId } = socket.handshake.query;

    if (!workflowId) {
      console.error('❌ Terminal connection attempt without workflowId');
      socket.disconnect();
      return;
    }

    const containerName = `hackract-project-${workflowId}`;
    console.log(`💻 Terminal client connected: ${socket.id} (Workflow: ${workflowId})`);

    try {
      // 1. Ensure the shared container is running (with race condition protection)
      let containerInfo = activeContainers.get(workflowId);
      
      if (!containerInfo) {
        // If another request is already starting the container, wait for it
        if (startingContainers.has(workflowId)) {
          console.log(`⏳ Waiting for container ${containerName} to finish starting...`);
          await startingContainers.get(workflowId);
          containerInfo = activeContainers.get(workflowId);
        } else {
          // We are the first to start the container
          const startPromise = (async () => {
            console.log(`🏗️ Starting shared container for project: ${workflowId}`);
            // Remove existing if any (resilience)
            await execAsync(`docker rm -f ${containerName}`).catch(() => {});
            
            // Start a persistent container in the background
            await execAsync(`docker run -d --name ${containerName} hackract-terminal tail -f /dev/null`);
            
            const info = { containerName, refCount: 0 };
            activeContainers.set(workflowId, info);
            return info;
          })();

          startingContainers.set(workflowId, startPromise);
          try {
            containerInfo = await startPromise;
          } finally {
            startingContainers.delete(workflowId);
          }
        }
      }

      if (!containerInfo) {
        throw new Error("Failed to initialize project container");
      }

      // 2. Spawn a NEW independent bash process inside that shared container
      console.log(`🐚 Spawning new shell process inside container: ${containerName}`);
      const ptyProcess = pty.spawn('docker', [
        'exec', 
        '-it', 
        containerName,
        '/bin/bash'
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env
      });

      containerInfo.refCount++;

      // 3. Handle data flow
      ptyProcess.onData((data) => {
        socket.emit('output', data);
      });

      socket.on('input', (data) => {
        ptyProcess.write(data);
      });

      socket.on('resize', (size) => {
        ptyProcess.resize(size.cols, size.rows);
      });

      // 4. Lifecycle management
      socket.on('disconnect', async () => {
        console.log(`💻 Terminal client disconnected: ${socket.id}`);
        ptyProcess.kill();
        
        containerInfo.refCount--;
        
        if (containerInfo.refCount <= 0) {
          console.log(`🛑 All shells closed. Stopping shared container: ${containerName}`);
          activeContainers.delete(workflowId);
          await execAsync(`docker stop ${containerName}`).catch(() => {});
          await execAsync(`docker rm ${containerName}`).catch(() => {});
        }
      });

    } catch (err) {
      console.error('❌ Failed to setup terminal process:', err);
      socket.emit('output', `\r\n[ERROR] Failed to start terminal: ${err.message}\r\n`);
      socket.disconnect();
    }
  });
};
