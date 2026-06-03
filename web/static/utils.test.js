const test = require("node:test");
const assert = require("node:assert/strict");
const utils = require("./utils.js");

const sampleCert = `-----BEGIN CERTIFICATE-----
MIIDhDCCAmygAwIBAgIUEpIbV/BZ3iXYisuQel6ZmJMd5vQwDQYJKoZIhvcNAQEL
BQAwPDEVMBMGA1UEAwwMZXhhbXBsZS50ZXN0MRAwDgYDVQQKDAdNeVRvb2xzMREw
DwYDVQQLDAhGcm9udGVuZDAeFw0yNjA2MDMwNjE5NDBaFw0yNjA2MDQwNjE5NDBa
MDwxFTATBgNVBAMMDGV4YW1wbGUudGVzdDEQMA4GA1UECgwHTXlUb29sczERMA8G
A1UECwwIRnJvbnRlbmQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCU
sA5qCpwRd0OmJw8aP6kyj/KSZyV8eM9ifsl771ynQqG6DnIA6OpBpV1F0kYK8bM5
11ceZe4cBJNwCaVM/FiumgUe6pTMYX0K7FH9neoIhwYx1QbbZuqdo2xJJt2Z9UBp
w52lGEk1qfz4DIbX111d4Nexh3BfOxYjbjO5kCON2S3iCZ4rv62BeBSxgQFgVHpp
INj+IB7W510H15yf206m4IpaSo60X1aISYgF31XyGzYsILneVnLY1uRn1OPfrYFy
qdMw0AQsIKI1b0P+ngg5eWYW35+qabhANZ85EVMBUtLj/5K/6lcUZwPl5rp3oNrd
/O/LpxuGjotcjLH6f4NBAgMBAAGjfjB8MB0GA1UdDgQWBBT+kNy/qdhNNMVciC63
EF75zZBOITAfBgNVHSMEGDAWgBT+kNy/qdhNNMVciC63EF75zZBOITAPBgNVHRMB
Af8EBTADAQH/MCkGA1UdEQQiMCCCDGV4YW1wbGUudGVzdIIQd3d3LmV4YW1wbGUu
dGVzdDANBgkqhkiG9w0BAQsFAAOCAQEAXesX1EZRfx43chz0CpzYWZZ9Czqrbka3
3RrKeTjQWEO3/i38dpGqcK9SJuZoibwOeTX0EB55X0BeLo0+5qT+KiXggCQvs1u6
SSD3utH+7bUF77R7ILumXhp7zyGvcR0b8cYCRik9zOr4wLU4l6/zf0j0XtSc5wgr
89btlubNXvABvknDbTlcTmSSJWyjRzjBHV4sU8u8YhfyR3soXkQiRsPHUgoSXQGi
aV7QlWsBtzZUk7mzoECb04wY9eJlQn51A2JG3LiwJZ5bzT5/REbmhoPFApbTrJOw
Ry98izmN9ebonZjuv/2MspKv6v1jhdk1tK7UOnwVe7siJMzB/2jIow==
-----END CERTIFICATE-----`;

const sampleCSR = `-----BEGIN CERTIFICATE REQUEST-----
MIICyTCCAbECAQAwQDEZMBcGA1UEAwwQY3NyLmV4YW1wbGUudGVzdDEQMA4GA1UE
CgwHTXlUb29sczERMA8GA1UECwwIRnJvbnRlbmQwggEiMA0GCSqGSIb3DQEBAQUA
A4IBDwAwggEKAoIBAQCUsA5qCpwRd0OmJw8aP6kyj/KSZyV8eM9ifsl771ynQqG6
DnIA6OpBpV1F0kYK8bM511ceZe4cBJNwCaVM/FiumgUe6pTMYX0K7FH9neoIhwYx
1QbbZuqdo2xJJt2Z9UBpw52lGEk1qfz4DIbX111d4Nexh3BfOxYjbjO5kCON2S3i
CZ4rv62BeBSxgQFgVHppINj+IB7W510H15yf206m4IpaSo60X1aISYgF31XyGzYs
ILneVnLY1uRn1OPfrYFyqdMw0AQsIKI1b0P+ngg5eWYW35+qabhANZ85EVMBUtLj
/5K/6lcUZwPl5rp3oNrd/O/LpxuGjotcjLH6f4NBAgMBAAGgRDBCBgkqhkiG9w0B
CQ4xNTAzMDEGA1UdEQQqMCiCEGNzci5leGFtcGxlLnRlc3SCFHd3dy5jc3IuZXhh
bXBsZS50ZXN0MA0GCSqGSIb3DQEBCwUAA4IBAQCLBnQ3p5++xqLQeRSMoH4NPkSQ
evKl99xrMtEVl5bi80be4WGl3l1aQJF3jv/CQYoYkXOJ0ex7zsKqTZytc7lSh75L
MO2Ux/+u2B7OE3YcbSNU9c/+PIxRvhXF9GdzsYpSssEjbxRwMiyWHEqVVU+SKRmo
N2kXvLUScmrAe3FgfjQ0pOCNNnGnu2Ks7/XUNOdW2AijHNgCgIvitNaV/Gn4YiJ2
kt8HsrsoTYl8jx15cNFEABVQj5X9R/lYVZ3jVMj3VxU1ar7eXIoYwkCCQBbBd6KQ
bqLPpEeLj9Se9gICstDgZfol3DbKjMo0a9zwishuTIc6mIt64jKMLPNtfZZC
-----END CERTIFICATE REQUEST-----`;

test("formatJSONText extracts JSON from log text", () => {
  const input = "2026-06-03T10:24:59.020615572+08:00 stderr F {\"ok\":true,\"items\":[1,2]} trailing";
  assert.equal(utils.formatJSONText(input, 2), "{\n  \"ok\": true,\n  \"items\": [\n    1,\n    2\n  ]\n}");
});

test("minifyJSONText handles arrays and string delimiters", () => {
  const input = "prefix [\"}\",{\"a\":1}] suffix";
  assert.equal(utils.minifyJSONText(input), "[\"}\",{\"a\":1}]");
});

test("base64 UTF-8 round trip", () => {
  const encoded = utils.utf8ToBase64("中文 test");
  assert.equal(encoded, "5Lit5paHIHRlc3Q=");
  assert.equal(utils.base64ToUtf8(encoded), "中文 test");
});

test("URL encode and decode", () => {
  const encoded = utils.encodeURLText("name=张三&x=1 2");
  assert.equal(encoded, "name%3D%E5%BC%A0%E4%B8%89%26x%3D1%202");
  assert.equal(utils.decodeURLText("name%3D%E5%BC%A0%E4%B8%89%26x%3D1+2"), "name=张三&x=1 2");
});

test("toPGArray auto formats numeric IDs", () => {
  assert.equal(utils.toPGArray("1\n2, 3，4"), "(1,2,3,4)");
});

test("toPGArray formats string IDs and escapes quotes", () => {
  assert.equal(utils.toPGArray("Hjx1121 Nkjda O'Reilly"), "('Hjx1121','Nkjda','O''Reilly')");
});

test("toPGArray supports forced modes and duplicates", () => {
  assert.equal(utils.toPGArray("1 1 2", { mode: "string", unique: false }), "('1','1','2')");
  assert.throws(() => utils.toPGArray("1 A", { mode: "number" }), /数字模式包含非数字值/);
});

test("normalizePEM wraps escaped CSR input", () => {
  const body = sampleCSR
    .replace("-----BEGIN CERTIFICATE REQUEST-----", "")
    .replace("-----END CERTIFICATE REQUEST-----", "")
    .replace(/\s+/g, "");
  const escaped = `-----BEGIN CERTIFICATE REQUEST-----\\n${body}\\n-----END CERTIFICATE REQUEST-----`;
  const normalized = utils.normalizePEM(escaped, "csr");
  assert.match(normalized, /^-----BEGIN CERTIFICATE REQUEST-----\n/);
  assert.match(normalized, /\n-----END CERTIFICATE REQUEST-----\n$/);
  assert.equal(normalized.split("\n")[1].length, 64);
});

test("splitCertificatePEMs splits certificate chains", () => {
  const certs = utils.splitCertificatePEMs(`${sampleCert}\n${sampleCert}`);
  assert.equal(certs.length, 2);
  assert.equal(certs[0], utils.normalizePEM(sampleCert, "cert"));
});

test("parseCertificatePEM extracts common fields", async () => {
  const cert = await utils.parseCertificatePEM(sampleCert);
  assert.equal(cert.subject, "CN=example.test, O=MyTools, OU=Frontend");
  assert.equal(cert.issuer, "CN=example.test, O=MyTools, OU=Frontend");
  assert.equal(cert.publicKeyAlgorithm, "RSA");
  assert.equal(cert.publicKeySize, 2048);
  assert.equal(cert.signatureAlgorithm, "SHA256-RSA");
  assert.equal(cert.version, 3);
  assert.equal(cert.isCA, true);
  assert.equal(cert.sha1.length, 40);
});

test("parseCSRPEM extracts subject and SAN", () => {
  const csr = utils.parseCSRPEM(sampleCSR);
  assert.equal(csr.subject, "CN=csr.example.test, O=MyTools, OU=Frontend");
  assert.equal(csr.commonName, "csr.example.test");
  assert.deepEqual(csr.dnsNames, ["csr.example.test", "www.csr.example.test"]);
  assert.equal(csr.publicKeyAlgorithm, "RSA");
  assert.equal(csr.publicKeySize, 2048);
  assert.equal(csr.signatureAlgorithm, "SHA256-RSA");
});
