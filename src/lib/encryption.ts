import crypto from 'crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKeyfromSecret(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret).digest();
}

export function encryptData(plainText:string, secret:string): string {
    const key    = getKeyfromSecret(secret);
    const iv     = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {authTagLength: AUTH_TAG_LENGTH});

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
    const authTag   = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptData(encryptedData:string, secret:string): string{
    const key  = getKeyfromSecret(secret);
    const data = Buffer.from(encryptedData, 'base64');

    if (data.length < IV_LENGTH + AUTH_TAG_LENGTH){
        console.error("Invalid encrypted data");
    }

    const iv            = data.subarray(0, IV_LENGTH);
    const authTag       = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH); 
    const encryptedText = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher   = crypto.createDecipheriv('aes-256-gcm', key, iv, {authTagLength: AUTH_TAG_LENGTH});
    decipher.setAuthTag(authTag);

    const decrypted  = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

    return decrypted.toString('utf-8');
}