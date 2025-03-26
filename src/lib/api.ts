import { DeviceInfo } from '@/types/device';

interface EnrollCodeResponse {
  enrollCode: {
    id: string;
    instrument_id: string;
    code: string;
    expires_at: string;
    created_at: string;
  };
  instrument: {
    id: string;
    hostname: string;
    platform: string;
    release: string;
    arch: string;
    cpus: number;
    total_memory: number;
    type: string;
    created_at: string;
    device_fingerprint: string;
  };
}

export async function getEnrollCode(deviceInfo: DeviceInfo): Promise<EnrollCodeResponse> {
  const response = await fetch('http://localhost:3000/api/sync/get_code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({deviceInfo}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error('Failed to get enrollment code');
  }

  return response.json();
} 