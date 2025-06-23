import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { machineIdSync } from 'node-machine-id';
import crypto from 'crypto';
import fs from 'fs';
import path from 'node:path';
import os from 'os';
import { DeviceInfo } from '../../types/device';

export function getDeviceId(): string {
  const userDataPath = app.getPath('userData');
  const idFilePath = path.join(userDataPath, 'device_id.txt');

  if (fs.existsSync(idFilePath)) {
    return fs.readFileSync(idFilePath, 'utf8');
  } else {
    const newId = uuidv4();
    fs.writeFileSync(idFilePath, newId);
    return newId;
  }
}

export function getDeviceFingerprint(): string {
  const machineId = machineIdSync(true);
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

export function getDeviceInfo(): DeviceInfo {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus().length,
    total_memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // in GB
    type: os.type(),
    device_id: getDeviceId(),
    device_fingerprint: getDeviceFingerprint()
  };
} 