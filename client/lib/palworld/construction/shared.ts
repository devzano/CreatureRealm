export async function yieldToUI() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
