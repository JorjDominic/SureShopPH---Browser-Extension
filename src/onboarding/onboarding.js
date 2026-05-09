document.getElementById("obDoneBtn").addEventListener("click", async () => {
  if (globalThis.SureShopStorage) {
    await SureShopStorage.markOnboarded();
  }
  window.close();
});
