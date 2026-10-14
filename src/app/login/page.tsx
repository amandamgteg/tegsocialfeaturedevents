export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main>
      <h1>TEG Social Event Picker</h1>
      <form method="POST" action="/api/login">
        <label>
          Password <input type="password" name="password" autoFocus required />
        </label>{" "}
        <button type="submit">Enter</button>
      </form>
      {error && <p role="alert">That password didn&apos;t work.</p>}
    </main>
  );
}
