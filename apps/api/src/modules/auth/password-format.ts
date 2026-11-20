/** The single Argon2id encoding currently supported by password verification. */
export function isSupportedPasswordHash(encoded: string): boolean {
  const parts = encoded.split("$");
  if (
    parts.length !== 6 ||
    parts[0] !== "" ||
    parts[1] !== "argon2id" ||
    parts[2] !== "v=19" ||
    parts[3] !== "m=65536,t=3,p=1"
  )
    return false;
  return [16, 32].every((length, index) => {
    const value = parts[index + 4];
    const bytes = Buffer.from(value, "base64");
    return bytes.length === length && bytes.toString("base64") === value;
  });
}
