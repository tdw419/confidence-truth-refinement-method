/**
 * CTRM Daemon Manager - Production Grade
 *
 * Features:
 * - Hot-reloading on code changes (no restart needed)
 * - Graceful shutdown and restart
 * - Crash recovery with exponential backoff
 * - Health monitoring and status reporting
 * - State persistence across restarts
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { watch } from 'chokidar';

interface DaemonConfig {
  projectPath: string;
  ctrmProjectRoot?: string;
  cycleTime: number;
  maxIterations?: number;
  autonomous?: boolean;
  watchPaths?: string[];
  healthCheckInterval?: number;
  restartDelay?: number;
  maxRestarts?: number;
  mlTrainingIntervalMs?: number; // New: Interval for ML training cycles
  mlTrainingMaxCycles?: number;  // New: Max ML training cycles (0 for infinite)
}

interface DaemonState {
  status: 'running' | 'stopped' | 'crashed' | 'restarting';
  startTime: number;
  lastCycleTime: number;
  totalCycles: number;
  crashes: number;
  lastError?: string;
  uptime: number;
}

export class DaemonManager {
  private process: ChildProcess | null = null;
  private config: DaemonConfig;
  private state: DaemonState;
  private watcher: any = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private stateFile: string;
  private isShuttingDown: boolean = false;
  private restartCount: number = 0;
  private lastRestartTime: number = 0;

  constructor(config: DaemonConfig) {
    this.config = {
      // Default values (cycleTime is now required in DaemonConfig interface)
      watchPaths: ['dist/**/*.js', 'lib/**/*.ts'],
      healthCheckInterval: 30000, // 30 seconds
      restartDelay: 5000, // 5 seconds
      maxRestarts: 10,
      ...config
    };

    // Ensure ctrmProjectRoot is resolved to an absolute path for state management
    const stateBasePath = this.config.ctrmProjectRoot || this.config.projectPath;
    this.stateFile = path.join(stateBasePath, '.ctrm', 'daemon_state.json');

    this.state = this.loadState() || {
      status: 'stopped',
      startTime: 0,
      lastCycleTime: 0,
      totalCycles: 0,
      crashes: 0,
      uptime: 0
    };
  }


  /**
   * Start the daemon with hot-reload capability
   */
  async start(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 Starting CTRM Daemon Manager');
    console.log('═'.repeat(70));
    console.log(`📁 Framework Path: ${this.config.projectPath}`);
    if (this.config.ctrmProjectRoot) {
      console.log(`📂 CTRM Project:   ${this.config.ctrmProjectRoot}`);
    } else {
      console.log(`📂 CTRM Project:   (using framework path)`);
    }
    console.log(`⏱️  Cycle Time:     ${this.config.cycleTime}s`);
    console.log(`🧠 Autonomous:     ${this.config.autonomous ? 'Enabled' : 'Disabled'}`);
    console.log(`🔄 Hot Reload:     Enabled`);
    console.log(`💓 Health Check:   Every ${this.config.healthCheckInterval! / 1000}s`);
    console.log('═'.repeat(70) + '\n');

    // Load previous state if exists
    if (this.state.totalCycles > 0) {
      console.log(`📊 Resuming from previous session:`);
      console.log(`   Total cycles completed: ${this.state.totalCycles}`);
      console.log(`   Previous uptime: ${Math.floor(this.state.uptime / 3600)}h ${Math.floor((this.state.uptime % 3600) / 60)}m`);
      console.log('');
    }

    // Start the daemon process
    await this.spawnDaemon();

    // Set up file watching for hot-reload
    this.setupHotReload();

    // Start health monitoring
    this.startHealthCheck();

    // Handle graceful shutdown
    this.setupShutdownHandlers();

    console.log('✅ Daemon manager is now running\n');
    console.log('Commands:');
    console.log('  Ctrl+C - Graceful shutdown');
    console.log('  SIGUSR1 - Trigger hot reload');
    console.log('  SIGUSR2 - Print status\n');
  }

  /**
   * Spawn the actual daemon process
   */
  private async spawnDaemon(): Promise<void> {
    if (this.process) {
      console.log('⚠️  Daemon already running, stopping first...');
      await this.stopDaemon();
    }

    console.log('🔄 Spawning daemon process...');

    const args = [
      'dist/bin/ctrm-cli.js',
      'daemon',
      '--cycle-time', this.config.cycleTime.toString()
    ];

    if (this.config.maxIterations) {
      args.push('--max-iterations', this.config.maxIterations.toString());
    }

    if (this.config.autonomous) {
      args.push('--autonomous');
    }

    if (this.config.ctrmProjectRoot) {
      args.push('--project-path', this.config.ctrmProjectRoot);
    }

    // Add new ML training arguments
    if (this.config.mlTrainingIntervalMs) {
        args.push('--ml-training-interval', this.config.mlTrainingIntervalMs.toString());
    }
    if (this.config.mlTrainingMaxCycles) {
        args.push('--ml-training-max-cycles', this.config.mlTrainingMaxCycles.toString());
    }

    this.process = spawn('node', args, {
      cwd: this.config.projectPath, // CWD is the framework root
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Clear previous error state on fresh spawn so status reflects current run
    delete this.state.lastError;
    this.state.status = 'running';
    this.state.startTime = Date.now();
    this.saveState();

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output);

      // Track cycle completion
      if (output.includes('✅ Cycle complete') || output.includes('Iteration')) {
        this.state.totalCycles++;
        this.state.lastCycleTime = Date.now();
        this.saveState();
      }
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      const error = data.toString();
      process.stderr.write(error);
      this.state.lastError = error;
      this.saveState();
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`\n⚠️  Daemon process exited (code: ${code}, signal: ${signal})`);

      if (!this.isShuttingDown) {
        this.state.status = 'crashed';
        this.state.crashes++;
        this.saveState();

        console.log(`💥 Crash detected (total crashes: ${this.state.crashes})`);
        this.handleCrash();
      }
    });

    // Handle errors
    this.process.on('error', (error) => {
      console.error('❌ Daemon process error:', error);
      this.state.lastError = error.message;
      this.saveState();
    });

    console.log(`✅ Daemon spawned (PID: ${this.process.pid})\n`);
  }

  /**
   * Set up hot-reload file watching
   */
  private setupHotReload(): void {
    console.log('👀 Setting up file watcher for hot-reload...');

    this.watcher = watch(this.config.watchPaths!, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      cwd: this.config.projectPath
    });

    let reloadTimeout: NodeJS.Timeout | null = null;

    this.watcher.on('change', (filePath: string) => {
      console.log(`\n🔥 File changed: ${filePath}`);

      // Debounce rapid changes
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }

      reloadTimeout = setTimeout(() => {
        console.log('♻️  Triggering hot reload...\n');
        this.hotReload();
      }, 1000); // Wait 1 second for multiple changes
    });

    console.log('✅ File watcher active\n');
  }

  /**
   * Hot reload the daemon without losing state
   */
  private async hotReload(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('♻️  HOT RELOAD IN PROGRESS');
    console.log('═'.repeat(70));

    const currentCycles = this.state.totalCycles;
    const currentUptime = this.state.uptime;

    console.log('1️⃣  Saving current state...');
    this.saveState();

    console.log('2️⃣  Gracefully stopping daemon...');
    await this.stopDaemon(false); // Don't shutdown manager

    console.log('3️⃣  Waiting for process to exit...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('4️⃣  Reloading code...');
    // Clear require cache for hot reload
    this.clearRequireCache();

    console.log('5️⃣  Spawning new daemon...');
    await this.spawnDaemon();

    console.log('6️⃣  Restoring state...');
    this.state.totalCycles = currentCycles;
    this.state.uptime = currentUptime;

    console.log('\n✅ Hot reload complete! Daemon running with updated code.');
    console.log('═'.repeat(70) + '\n');
  }

  /**
   * Clear Node's require cache for hot reload
   */
  private clearRequireCache(): void {
    const cacheKeys = Object.keys(require.cache);
    const projectPath = path.resolve(this.config.projectPath);

    cacheKeys.forEach(key => {
      if (key.startsWith(projectPath)) {
        delete require.cache[key];
      }
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.config.healthCheckInterval!);
  }

  /**
   * Check daemon health
   */
  private checkHealth(): void {
    const now = Date.now();
    const timeSinceLastCycle = now - this.state.lastCycleTime;
    const expectedCycleTime = this.config.cycleTime * 1000 * 2; // 2x expected time

    // Update uptime
    if (this.state.status === 'running') {
      this.state.uptime = Math.floor((now - this.state.startTime) / 1000);
      this.saveState();
    }

    // Check if daemon is responsive
    if (this.state.totalCycles > 0 && timeSinceLastCycle > expectedCycleTime) {
      console.log('\n⚠️  WARNING: Daemon may be unresponsive');
      console.log(`   Last cycle was ${Math.floor(timeSinceLastCycle / 1000)}s ago`);
      console.log(`   Expected cycle time: ${this.config.cycleTime}s\n`);
    }

    // Log status periodically (every 10 health checks = ~5 minutes)
    if (this.state.totalCycles % 10 === 0 && this.state.status === 'running') {
      this.printStatus();
    }
  }

  /**
   * Handle daemon crash with exponential backoff
   */
  private async handleCrash(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRestart = now - this.lastRestartTime;

    // Reset restart count if it's been more than 5 minutes
    if (timeSinceLastRestart > 300000) {
      this.restartCount = 0;
    }

    this.restartCount++;

    if (this.restartCount > this.config.maxRestarts!) {
      console.error('\n❌ Maximum restart attempts reached. Stopping daemon manager.');
      console.error('   Please investigate the issue and restart manually.\n');
      process.exit(1);
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 80s...
    const backoffDelay = this.config.restartDelay! * Math.pow(2, this.restartCount - 1);
    const maxDelay = 300000; // Cap at 5 minutes
    const delay = Math.min(backoffDelay, maxDelay);

    console.log(`\n🔄 Attempting restart ${this.restartCount}/${this.config.maxRestarts}`);
    console.log(`   Waiting ${Math.floor(delay / 1000)}s before restart...\n`);

    this.state.status = 'restarting';
    this.saveState();

    await new Promise(resolve => setTimeout(resolve, delay));

    this.lastRestartTime = now;
    await this.spawnDaemon();
  }

  /**
   * Stop the daemon gracefully
   */
  private async stopDaemon(shutdownManager: boolean = true): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log('🛑 Stopping daemon gracefully...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      // Set timeout for forceful kill
      const killTimeout = setTimeout(() => {
        if (this.process) {
          console.log('⚠️  Force killing unresponsive daemon...');
          this.process.kill('SIGKILL');
        }
      }, 10000); // 10 second timeout

      this.process.once('exit', () => {
        clearTimeout(killTimeout);
        this.process = null;

        if (shutdownManager) {
          this.state.status = 'stopped';
        }

        this.saveState();
        console.log('✅ Daemon stopped\n');
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    // Ctrl+C (SIGINT)
    process.on('SIGINT', async () => {
      console.log('\n\n📥 Received SIGINT (Ctrl+C)');
      await this.shutdown();
    });

    // Kill signal (SIGTERM)
    process.on('SIGTERM', async () => {
      console.log('\n\n📥 Received SIGTERM');
      await this.shutdown();
    });

    // Hot reload signal (SIGUSR1)
    process.on('SIGUSR1', () => {
      console.log('\n\n📥 Received SIGUSR1 - Hot reload triggered');
      this.hotReload();
    });

    // Status signal (SIGUSR2)
    process.on('SIGUSR2', () => {
      console.log('\n\n📥 Received SIGUSR2 - Printing status');
      this.printStatus();
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('\n❌ Uncaught exception in daemon manager:', error);
      this.shutdown();
    });
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    console.log('\n' + '═'.repeat(70));
    console.log('🛑 GRACEFUL SHUTDOWN');
    console.log('═'.repeat(70));

    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      console.log('✅ Health monitoring stopped');
    }

    // Stop file watcher
    if (this.watcher) {
      await this.watcher.close();
      console.log('✅ File watcher stopped');
    }

    // Stop daemon
    await this.stopDaemon();

    // Save final state
    this.state.status = 'stopped';
    this.saveState();

    // Print final stats
    console.log('\n📊 Final Statistics:');
    console.log(`   Total cycles: ${this.state.totalCycles}`);
    console.log(`   Total crashes: ${this.state.crashes}`);
    console.log(`   Total uptime: ${Math.floor(this.state.uptime / 3600)}h ${Math.floor((this.state.uptime % 3600) / 60)}m`);
    console.log('');
    console.log('═'.repeat(70));
    console.log('👋 Daemon manager shutdown complete');
    console.log('═'.repeat(70) + '\n');

    process.exit(0);
  }

  /**
   * Print current status
   */
  private printStatus(): void {
    const now = Date.now();
    const currentUptime = Math.floor((now - this.state.startTime) / 1000);
    const uptimeHours = Math.floor(currentUptime / 3600);
    const uptimeMinutes = Math.floor((currentUptime % 3600) / 60);
    const uptimeSeconds = currentUptime % 60;

    console.log('\n' + '═'.repeat(70));
    console.log('📊 DAEMON STATUS');
    console.log('═'.repeat(70));
    console.log(`Status:        ${this.state.status.toUpperCase()}`);
    console.log(`PID:           ${this.process?.pid || 'N/A'}`);
    console.log(`Uptime:        ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`);
    console.log(`Total Cycles:  ${this.state.totalCycles}`);
    console.log(`Crashes:       ${this.state.crashes}`);
    console.log(`Restarts:      ${this.restartCount}`);

    if (this.state.lastCycleTime > 0) {
      const timeSinceCycle = Math.floor((now - this.state.lastCycleTime) / 1000);
      console.log(`Last Cycle:    ${timeSinceCycle}s ago`);
    }

    if (this.state.lastError) {
      console.log(`Last Error:    ${this.state.lastError.slice(0, 60)}...`);
    }

    console.log('═'.repeat(70) + '\n');
  }

  /**
   * Save daemon state to disk
   */
  private saveState(): void {
    try {
      const stateDir = path.dirname(this.stateFile);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('⚠️  Failed to save state:', error);
    }
  }

  /**
   * Load daemon state from disk
   */
  private loadState(): DaemonState | null {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('⚠️  Failed to load state:', error);
    }
    return null;
  }
}

// CLI entry point
if (require.main === module) {
  const rawArgs = process.argv.slice(2);
  let ctrmProjectRoot: string | undefined;
  let cycleTime: number | undefined;
  let maxIterations: number | undefined;
  let autonomous: boolean = false;

  // Parse --ctrm-project-root
  const projectRootIndex = rawArgs.indexOf('--ctrm-project-root');
  if (projectRootIndex > -1 && rawArgs[projectRootIndex + 1]) {
    ctrmProjectRoot = path.resolve(rawArgs[projectRootIndex + 1]);
  }

  // Parse --autonomous
  if (rawArgs.includes('--autonomous')) {
    autonomous = true;
  }

  // Parse --cycle-time
  const cycleTimeIndex = rawArgs.indexOf('--cycle-time');
  if (cycleTimeIndex > -1 && rawArgs[cycleTimeIndex + 1]) {
    cycleTime = parseInt(rawArgs[cycleTimeIndex + 1]);
  }

  // Parse --max-iterations
  const maxIterationsIndex = rawArgs.indexOf('--max-iterations');
  if (maxIterationsIndex > -1 && rawArgs[maxIterationsIndex + 1]) {
    maxIterations = parseInt(rawArgs[maxIterationsIndex + 1]);
  }
  
  const config: DaemonConfig = {
    projectPath: process.cwd(), // This is the framework root
    ctrmProjectRoot: ctrmProjectRoot,
    cycleTime: cycleTime || 60, // Default to 60 if not specified
    autonomous: autonomous,
    maxIterations: maxIterations
  };

  const manager = new DaemonManager(config);
  manager.start();
}

export default DaemonManager;
