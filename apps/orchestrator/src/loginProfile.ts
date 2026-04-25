import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function resolveStorageState(
  keyVaultUrl: string,
  profileName: string,
  runId: string,
): Promise<string> {
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUrl, credential);

  const secretName = `login-profile-${profileName}`;
  const secret = await client.getSecret(secretName);

  if (!secret.value) {
    throw new Error(`Key Vault secret '${secretName}' is empty`);
  }

  // Write storage state JSON to a temp file for Playwright to consume
  const dir = path.join(os.tmpdir(), `run-${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'storage-state.json');
  fs.writeFileSync(filePath, secret.value, 'utf8');

  return filePath;
}
