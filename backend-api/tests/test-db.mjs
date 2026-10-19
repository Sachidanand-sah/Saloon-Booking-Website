/**
 * API tests use their own database: TEST_DATABASE_URL, or DATABASE_URL with "_test"
 * appended to the database name. Anything not ending in "_test" is refused so a
 * misconfiguration can never wipe development or production data.
 */
export function testDatabaseUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '');
  if (!process.env.TEST_DATABASE_URL) url.pathname = `${url.pathname}_test`;
  if (!url.pathname.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${url.pathname.slice(1)}": database name must end in _test`);
  }
  return url.toString();
}
